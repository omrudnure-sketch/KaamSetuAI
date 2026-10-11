// Supabase Model Abstraction Layer for KaamSetu AI
// Replaces Mongoose with official @supabase/supabase-js client while maintaining API & query compatibility

import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

export const shouldUseLiveSupabase = () => {
  if (!supabaseAdmin) return false;
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_LIVE_DB) return false;
  return true;
};

// Field name casing conversions
export const camelToSnake = (str) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const snakeToCamel = (str) =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

export const mapObjectToSnake = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const res = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '_id') {
      res['id'] = val;
    } else if (key.startsWith('$')) {
      // Ignore Mongo operator wrappers like $set
      if (typeof val === 'object' && val !== null) {
        Object.assign(res, mapObjectToSnake(val));
      }
    } else {
      res[camelToSnake(key)] = val;
    }
  }
  return res;
};

export const mapObjectToCamel = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const res = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    res[camelKey] = val;
  }
  // Guarantee both _id and id are present and stringified
  if (res.id !== undefined) {
    res._id = String(res.id);
    res.id = String(res.id);
  }
  return res;
};

// Verified column whitelist per Supabase table to prevent PostgREST PGRST204 errors
export const SUPABASE_TABLE_COLUMNS = {
  users: new Set(['id', 'name', 'email', 'phone', 'password_hash', 'role', 'admin_role', 'permissions', 'preferred_language', 'status', 'is_verified', 'last_login_at', 'created_at', 'updated_at']),
  worker_profiles: new Set(['id', 'user_id', 'bio', 'skills', 'experience_years', 'daily_wage', 'hourly_rate', 'availability', 'location', 'city', 'latitude', 'longitude', 'profile_completion', 'rating', 'review_count', 'completed_projects', 'created_at', 'updated_at']),
  employer_profiles: new Set(['id', 'user_id', 'company_name', 'business_type', 'contact_person', 'location', 'city', 'profile_completion', 'rating', 'review_count', 'created_at', 'updated_at']),
  jobs: new Set(['id', 'employer_id', 'title', 'description', 'category', 'required_skills', 'wage_type', 'wage_amount', 'duration_days', 'location', 'latitude', 'longitude', 'workers_needed', 'status', 'ai_generated', 'created_at', 'updated_at']),
  job_applications: new Set(['id', 'job_id', 'worker_id', 'proposed_wage', 'cover_note', 'status', 'applied_at', 'updated_at']),
  job_invitations: new Set(['id', 'job_id', 'worker_id', 'employer_id', 'status', 'created_at', 'updated_at']),
  hiring_agreements: new Set(['id', 'job_id', 'employer_id', 'worker_id', 'agreed_wage', 'wage_type', 'start_date', 'expected_end_date', 'terms', 'proposed_by', 'status', 'confirmed_at', 'created_at', 'updated_at']),
  projects: new Set(['id', 'hiring_agreement_id', 'employer_id', 'title', 'description', 'location', 'start_date', 'expected_end_date', 'actual_end_date', 'payment_amount', 'status', 'completion_requested_by', 'created_at', 'updated_at']),
  project_workers: new Set(['id', 'project_id', 'worker_id', 'hiring_agreement_id', 'agreed_wage', 'wage_type', 'status', 'joined_at']),
  progress_updates: new Set(['id', 'project_id', 'worker_id', 'date', 'completion_percentage', 'summary', 'created_at']),
  project_extensions: new Set(['id', 'project_id', 'requested_by', 'additional_days', 'reason', 'original_end_date', 'new_end_date', 'status', 'approved_by', 'created_at', 'updated_at']),
  payments: new Set(['id', 'project_id', 'payer_id', 'payee_id', 'amount', 'wage_type', 'status', 'payment_date', 'transaction_ref', 'notes', 'created_at']),
  reviews: new Set(['id', 'project_id', 'reviewer_id', 'reviewee_id', 'rating', 'comment', 'created_at']),
  messages: new Set(['id', 'conversation_id', 'sender_id', 'content', 'is_read', 'read_at', 'created_at']),
  conversations: new Set(['id', 'participants', 'created_at', 'updated_at']),
  notifications: new Set(['id', 'user_id', 'type', 'title', 'message', 'is_read', 'data', 'created_at']),
  complaints: new Set(['id', 'filed_by', 'against_user_id', 'project_id', 'category', 'description', 'status', 'assigned_admin_id', 'resolution_notes', 'resolved_at', 'created_at', 'updated_at']),
  disputes: new Set(['id', 'complaint_id', 'project_id', 'claimant_id', 'respondent_id', 'assigned_admin_id', 'status', 'resolution_notes', 'resolved_at', 'created_at', 'updated_at']),
  verification_records: new Set(['id', 'user_id', 'document_type', 'document_number', 'status', 'verified_by', 'verified_at', 'created_at']),
  risk_flags: new Set(['id', 'user_id', 'risk_score', 'factors', 'flagged_at']),
};

export const filterValidColumns = (tableName, data) => {
  const allowed = SUPABASE_TABLE_COLUMNS[tableName];
  if (!allowed) return data;
  const filtered = {};
  for (const [key, val] of Object.entries(data)) {
    if (allowed.has(key)) {
      filtered[key] = val;
    }
  }
  return filtered;
};


// Document Instance class
export class SupabaseDocument {
  constructor(data, model) {
    this._model = model;
    this._isNew = !data.id && !data._id;
    const camelData = mapObjectToCamel(data);
    Object.assign(this, camelData);

    if (!this.id && !this._id) {
      const generatedId = crypto.randomUUID();
      this.id = generatedId;
      this._id = generatedId;
    } else {
      this.id = String(this.id || this._id);
      this._id = this.id;
    }

    if (!this.createdAt) this.createdAt = new Date().toISOString();
    if (!this.updatedAt) this.updatedAt = new Date().toISOString();
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const plain = this.toJSON();
    if (this._isNew) {
      const created = await this._model.create(plain);
      Object.assign(this, created);
      this._isNew = false;
      return this;
    } else {
      const updated = await this._model.findByIdAndUpdate(this.id, plain, { new: true });
      if (updated) Object.assign(this, updated);
      return this;
    }
  }

  toJSON() {
    const copy = {};
    for (const key of Object.keys(this)) {
      if (!key.startsWith('_') || key === '_id') {
        copy[key] = this[key];
      }
    }
    return copy;
  }

  toObject() {
    return this.toJSON();
  }

  toString() {
    return this.id || this._id;
  }

  async populate(config) {
    const configs = Array.isArray(config) ? config : [config];
    await this._model._applyPopulate([this], configs);
    return this;
  }
}

// In-Memory store per table for offline testing and fixtures
const globalInMemoryStores = new Map();

export const getInMemoryStore = (tableName) => {
  if (!globalInMemoryStores.has(tableName)) {
    globalInMemoryStores.set(tableName, new Map());
  }
  return globalInMemoryStores.get(tableName);
};

export const clearAllInMemoryStores = () => {
  for (const store of globalInMemoryStores.values()) {
    store.clear();
  }
};

// Query Builder for chained operations (.sort(), .limit(), .skip(), .populate())
export class SupabaseQuery {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter;
    this.isSingle = single;
    this.sortCriteria = null;
    this.limitCount = null;
    this.skipCount = 0;
    this.selectedFields = null;
    this.populateConfigs = [];
    this.isLean = false;
  }

  sort(criteria) {
    this.sortCriteria = criteria;
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  skip(n) {
    this.skipCount = n;
    return this;
  }

  select(fields) {
    this.selectedFields = fields;
    return this;
  }

  populate(config) {
    if (config) this.populateConfigs.push(config);
    return this;
  }

  lean() {
    this.isLean = true;
    return this;
  }

  async exec() {
    return await this.model._executeFind(this);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

// Main Model Base Class
export class SupabaseModel {
  constructor(tableName, defaultValues = {}) {
    this.tableName = tableName;
    this.defaultValues = defaultValues;
  }

  // Create document instance
  new(data = {}) {
    return new SupabaseDocument({ ...this.defaultValues, ...data }, this);
  }

  // Find multiple documents
  find(filter = {}) {
    return new SupabaseQuery(this, filter, false);
  }

  // Find single document
  findOne(filter = {}) {
    return new SupabaseQuery(this, filter, true);
  }

  // Find by primary key ID
  findById(id) {
    if (!id) return new SupabaseQuery(this, { id: '___non_existent___' }, true);
    const cleanId = String(id._id || id.id || id);
    return this.findOne({ id: cleanId });
  }

  // Count matching documents
  async countDocuments(filter = {}) {
    const results = await this.find(filter);
    return results ? results.length : 0;
  }

  // Create one or multiple records
  async create(data) {
    if (Array.isArray(data)) {
      const created = [];
      for (const item of data) {
        created.push(await this.create(item));
      }
      return created;
    }

    const docId = data.id || data._id || crypto.randomUUID();
    const docData = {
      ...this.defaultValues,
      ...data,
      id: String(docId),
      _id: String(docId),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If live Supabase client is connected, insert to Supabase table
    if (shouldUseLiveSupabase()) {
      try {
        const snakeData = mapObjectToSnake(docData);
        delete snakeData._id; // PostgreSQL uses 'id'
        const validColumnsData = filterValidColumns(this.tableName, snakeData);
        const { data: inserted, error } = await supabaseAdmin
          .from(this.tableName)
          .insert(validColumnsData)
          .select()
          .single();

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            const dupErr = new Error(error.message || 'Duplicate key constraint violation');
            dupErr.code = '23505';
            throw dupErr;
          }
          console.warn(`[Supabase ${this.tableName} Insert Notice]:`, error.message || error.code);
        } else if (inserted) {
          const doc = new SupabaseDocument(mapObjectToCamel(inserted), this);
          getInMemoryStore(this.tableName).set(doc.id, doc);
          return doc;
        }
      } catch (err) {
        if (err.code === '23505') throw err;
        console.warn(`[Supabase ${this.tableName} Fallback Notice]:`, err.message);
      }
    }

    // In-memory persistence
    const doc = new SupabaseDocument(docData, this);
    getInMemoryStore(this.tableName).set(doc.id, doc);
    return doc;
  }

  // Find and update by ID
  async findByIdAndUpdate(id, update, options = {}) {
    const cleanId = String(id._id || id.id || id);
    return await this.findOneAndUpdate({ id: cleanId }, update, options);
  }

  // Find and update matching filter
  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await this.findOne(filter);
    if (!existing) {
      if (options.upsert) {
        const payload = update.$set ? { ...filter, ...update.$set } : { ...filter, ...update };
        return await this.create(payload);
      }
      return null;
    }

    const updateFields = update.$set ? update.$set : update;
    const merged = { ...existing.toJSON(), ...updateFields, updatedAt: new Date().toISOString() };

    if (shouldUseLiveSupabase()) {
      try {
        const snakeData = mapObjectToSnake(updateFields);
        const validColumnsData = filterValidColumns(this.tableName, snakeData);
        const { data: updated, error } = await supabaseAdmin
          .from(this.tableName)
          .update(validColumnsData)
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && updated) {
          const doc = new SupabaseDocument(mapObjectToCamel(updated), this);
          getInMemoryStore(this.tableName).set(doc.id, doc);
          return options.new === false ? existing : doc;
        }
      } catch (_err) {
        // Fall back to memory store
      }
    }

    const doc = new SupabaseDocument(merged, this);
    getInMemoryStore(this.tableName).set(doc.id, doc);
    return options.new === false ? existing : doc;
  }

  // Find by ID and delete
  async findByIdAndDelete(id) {
    const cleanId = String(id._id || id.id || id);
    return await this.findOneAndDelete({ id: cleanId });
  }

  // Find matching record and delete
  async findOneAndDelete(filter) {
    const existing = await this.findOne(filter);
    if (!existing) return null;

    if (shouldUseLiveSupabase()) {
      try {
        await supabaseAdmin.from(this.tableName).delete().eq('id', existing.id);
      } catch (_err) {
        // Ignore
      }
    }

    getInMemoryStore(this.tableName).delete(existing.id);
    return existing;
  }

  // Delete all matching records
  async deleteMany(filter = {}) {
    const docs = await this.find(filter);
    let deletedCount = 0;
    for (const doc of docs) {
      await this.findByIdAndDelete(doc.id);
      deletedCount++;
    }
    return { deletedCount };
  }

  // Check if document matching filter exists
  async exists(filter = {}) {
    const doc = await this.findOne(filter);
    return doc ? { _id: doc.id, id: doc.id } : null;
  }

  // Update multiple matching documents
  async updateMany(filter = {}, update = {}) {
    const docs = await this.find(filter);
    let modifiedCount = 0;
    const updateFields = update.$set ? update.$set : update;
    for (const doc of docs) {
      await this.findByIdAndUpdate(doc.id, updateFields);
      modifiedCount++;
    }
    return { matchedCount: docs.length, modifiedCount };
  }

  // Update one matching document
  async updateOne(filter = {}, update = {}) {
    const doc = await this.findOne(filter);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    const updateFields = update.$set ? update.$set : update;
    await this.findByIdAndUpdate(doc.id, updateFields);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  // Aggregation pipeline ($match, $group with $sum/$avg/$push, $sort, $limit)
  async aggregate(pipeline = []) {
    let items = await this.find({});
    items = items.map((doc) => (doc.toJSON ? doc.toJSON() : { ...doc }));

    for (const stage of pipeline) {
      if (stage.$match) {
        items = items.filter((doc) => this._matchesFilter(doc, stage.$match));
      } else if (stage.$group) {
        const groupSpec = stage.$group;
        const groups = new Map();

        const getGroupKey = (doc, keyDef) => {
          if (!keyDef) return 'null';
          if (typeof keyDef === 'string' && keyDef.startsWith('$')) {
            const field = keyDef.slice(1);
            return String(this._getNestedValue(doc, field) ?? 'null');
          }
          return String(keyDef);
        };

        for (const doc of items) {
          const groupKey = getGroupKey(doc, groupSpec._id);
          if (!groups.has(groupKey)) {
            let initialId = groupSpec._id;
            if (typeof initialId === 'string' && initialId.startsWith('$')) {
              initialId = this._getNestedValue(doc, initialId.slice(1));
            } else if (initialId === null) {
              initialId = null;
            }
            groups.set(groupKey, { _id: initialId, _count: 0, _docs: [] });
          }
          const groupObj = groups.get(groupKey);
          groupObj._count++;
          groupObj._docs.push(doc);
        }

        const aggregated = [];
        for (const groupObj of groups.values()) {
          const res = { _id: groupObj._id };
          for (const [outField, accumulator] of Object.entries(groupSpec)) {
            if (outField === '_id') continue;
            if (typeof accumulator === 'object' && accumulator !== null) {
              if (accumulator.$sum !== undefined) {
                if (accumulator.$sum === 1) {
                  res[outField] = groupObj._count;
                } else if (typeof accumulator.$sum === 'string' && accumulator.$sum.startsWith('$')) {
                  const field = accumulator.$sum.slice(1);
                  res[outField] = groupObj._docs.reduce((sum, d) => sum + Number(this._getNestedValue(d, field) || 0), 0);
                } else {
                  res[outField] = groupObj._docs.reduce((sum, d) => sum + Number(accumulator.$sum || 0), 0);
                }
              } else if (accumulator.$avg !== undefined) {
                if (typeof accumulator.$avg === 'string' && accumulator.$avg.startsWith('$')) {
                  const field = accumulator.$avg.slice(1);
                  const validDocs = groupObj._docs.filter((d) => this._getNestedValue(d, field) !== undefined && this._getNestedValue(d, field) !== null);
                  const total = validDocs.reduce((sum, d) => sum + Number(this._getNestedValue(d, field) || 0), 0);
                  res[outField] = validDocs.length > 0 ? total / validDocs.length : 0;
                }
              } else if (accumulator.$push !== undefined) {
                res[outField] = groupObj._docs;
              }
            }
          }
          aggregated.push(res);
        }
        items = aggregated;
      } else if (stage.$sort) {
        const sortKey = Object.keys(stage.$sort)[0];
        const dir = stage.$sort[sortKey];
        items.sort((a, b) => {
          const valA = a[sortKey] ?? 0;
          const valB = b[sortKey] ?? 0;
          return dir === -1 || dir === 'desc'
            ? valA < valB ? 1 : valA > valB ? -1 : 0
            : valA > valB ? 1 : valA < valB ? -1 : 0;
        });
      } else if (stage.$limit) {
        items = items.slice(0, stage.$limit);
      }
    }

    return items;
  }

  // Execute find query (internal)
  async _executeFind(query) {
    const { filter, isSingle, sortCriteria, limitCount, skipCount } = query;

    let items = [];

    // Try querying live Supabase if available
    let queriedFromSupabase = false;
    if (shouldUseLiveSupabase()) {
      try {
        let sbQuery = supabaseAdmin.from(this.tableName).select('*');

        // PostgREST .or() filter handling
        if (filter.$or && Array.isArray(filter.$or)) {
          const orConditions = [];
          for (const condition of filter.$or) {
            for (const [k, v] of Object.entries(condition)) {
              const snakeKey = k === '_id' ? 'id' : camelToSnake(k);
              if (v !== undefined && v !== null) {
                orConditions.push(`${snakeKey}.eq.${v}`);
              }
            }
          }
          if (orConditions.length > 0) {
            sbQuery = sbQuery.or(orConditions.join(','));
          }
        }

        // Apply remaining filters
        for (const [k, v] of Object.entries(filter)) {
          if (k === '$or') continue;
          const snakeKey = k === '_id' ? 'id' : camelToSnake(k);
          if (v !== undefined && v !== null) {
            if (typeof v === 'object' && !Array.isArray(v)) {
              if (v.$gte !== undefined) sbQuery = sbQuery.gte(snakeKey, v.$gte);
              if (v.$lte !== undefined) sbQuery = sbQuery.lte(snakeKey, v.$lte);
              if (v.$gt !== undefined) sbQuery = sbQuery.gt(snakeKey, v.$gt);
              if (v.$lt !== undefined) sbQuery = sbQuery.lt(snakeKey, v.$lt);
              if (v.$in !== undefined) sbQuery = sbQuery.in(snakeKey, v.$in);
              if (v.$ne !== undefined) sbQuery = sbQuery.neq(snakeKey, v.$ne);
            } else {
              sbQuery = sbQuery.eq(snakeKey, v);
            }
          }
        }

        if (isSingle) {
          const { data: singleRow, error } = await sbQuery.maybeSingle();
          if (!error) {
            queriedFromSupabase = true;
            if (!singleRow) return null;
            return new SupabaseDocument(mapObjectToCamel(singleRow), this);
          }
        } else {
          const { data: rows, error } = await sbQuery;
          if (!error && rows) {
            queriedFromSupabase = true;
            items = rows.map((r) => new SupabaseDocument(mapObjectToCamel(r), this));
          }
        }
      } catch (_err) {
        queriedFromSupabase = false;
      }
    }

    // Fall back to / combine with in-memory store
    if (!queriedFromSupabase) {
      const store = getInMemoryStore(this.tableName);
      items = Array.from(store.values())
        .filter((doc) => this._matchesFilter(doc, filter))
        .map((doc) => new SupabaseDocument(doc.toJSON ? doc.toJSON() : { ...doc }, this));
    }

    // Apply sorting
    if (sortCriteria) {
      const sortKey = Object.keys(sortCriteria)[0];
      const direction = sortCriteria[sortKey];
      items.sort((a, b) => {
        const valA = a[sortKey] || '';
        const valB = b[sortKey] || '';
        if (direction === -1 || direction === 'desc') {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      });
    }

    // Apply pagination (skip and limit)
    if (skipCount > 0) {
      items = items.slice(skipCount);
    }
    if (limitCount !== null && limitCount !== undefined) {
      items = items.slice(0, limitCount);
    }

    // Apply populate if requested
    if (query.populateConfigs && query.populateConfigs.length > 0) {
      await this._applyPopulate(items, query.populateConfigs);
    }

    if (query.isLean) {
      items = items.map((item) => (item.toJSON ? item.toJSON() : item));
    }

    if (isSingle) {
      return items.length > 0 ? items[0] : null;
    }

    return items;
  }

  // Populate referenced entities
  async _applyPopulate(items, populateConfigs) {
    const tableFieldMap = {
      employerId: 'users',
      workerId: 'users',
      userId: 'users',
      reviewedBy: 'users',
      revieweeId: 'users',
      againstUserId: 'users',
      filedBy: 'users',
      senderId: 'users',
      requestedBy: 'users',
      participants: 'users',
      jobId: 'jobs',
      projectId: 'projects',
      hiringAgreementId: 'hiring_agreements',
      projectWorkerId: 'project_workers',
      conversationId: 'conversations',
    };

    for (const config of populateConfigs) {
      const path = typeof config === 'string' ? config : config?.path;
      const select = typeof config === 'object' ? config.select : null;
      const nested = typeof config === 'object' ? config.populate : null;

      if (!path) continue;
      const targetTable = tableFieldMap[path];
      if (!targetTable) continue;

      const targetModel = modelRegistry.get(targetTable);
      if (!targetModel) continue;

      for (const item of items) {
        const refVal = item[path];
        if (!refVal) continue;

        if (Array.isArray(refVal)) {
          const populatedList = [];
          for (const element of refVal) {
            const elId = typeof element === 'object' ? (element.id || element._id) : element;
            if (!elId) continue;
            try {
              const populatedDoc = await targetModel.findById(elId);
              if (populatedDoc) {
                let populatedObj = populatedDoc.toObject ? populatedDoc.toObject() : { ...populatedDoc };
                if (select && typeof select === 'string') {
                  const allowedFields = new Set(['id', '_id', ...select.split(/\s+/).filter(Boolean)]);
                  const filtered = {};
                  for (const [k, v] of Object.entries(populatedObj)) {
                    if (allowedFields.has(k)) filtered[k] = v;
                  }
                  populatedObj = filtered;
                }
                populatedObj.toString = function () { return String(this.id || this._id || ''); };
                populatedList.push(populatedObj);
              }
            } catch (_err) {}
          }
          item[path] = populatedList;
          continue;
        }

        const refId = typeof refVal === 'object' ? (refVal.id || refVal._id) : refVal;
        if (!refId) continue;

        try {
          const populatedDoc = await targetModel.findById(refId);
          if (populatedDoc) {
            let populatedObj = populatedDoc.toObject ? populatedDoc.toObject() : { ...populatedDoc };
            if (select && typeof select === 'string') {
              const allowedFields = new Set(['id', '_id', ...select.split(/\s+/).filter(Boolean)]);
              const filtered = {};
              for (const [k, v] of Object.entries(populatedObj)) {
                if (allowedFields.has(k)) filtered[k] = v;
              }
              populatedObj = filtered;
            }
            populatedObj.toString = function () { return String(this.id || this._id || ''); };
            if (nested && Array.isArray(nested)) {
              await targetModel._applyPopulate([populatedObj], nested);
            }
            item[path] = populatedObj;
          }
        } catch (_err) {
          // Skip if population fails
        }
      }
    }
  }

  _getNestedValue(doc, path) {
    if (!doc || !path) return undefined;
    if (path === '_id' || path === 'id') return doc.id || doc._id;
    if (!path.includes('.')) return doc[path];
    const parts = path.split('.');
    let curr = doc;
    for (const p of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[p];
    }
    return curr;
  }

  _extractIdOrPrimitive(val) {
    if (!val) return val;
    if (typeof val === 'object') {
      if (val.id !== undefined) return val.id;
      if (val._id !== undefined) return val._id;
    }
    return val;
  }

  // Filter matching helper
  _matchesFilter(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;

    // Handle $or condition
    if (filter.$or && Array.isArray(filter.$or)) {
      const orMatched = filter.$or.some((subFilter) => this._matchesFilter(doc, subFilter));
      if (!orMatched) return false;
    }

    for (const [key, expected] of Object.entries(filter)) {
      if (key === '$or') continue;

      const rawDocVal = this._getNestedValue(doc, key);
      const docVal = this._extractIdOrPrimitive(rawDocVal);
      const expVal = this._extractIdOrPrimitive(expected);

      if (expected instanceof RegExp) {
        if (!expected.test(String(docVal || ''))) return false;
      } else if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (expected.$all && Array.isArray(expected.$all)) {
          const arr = Array.isArray(rawDocVal) ? rawDocVal.map((x) => String(this._extractIdOrPrimitive(x))) : [];
          if (!expected.$all.every((val) => arr.includes(String(this._extractIdOrPrimitive(val))))) return false;
        }
        if (expected.$in && Array.isArray(expected.$in)) {
          const inList = expected.$in.map((item) => String(this._extractIdOrPrimitive(item)));
          if (!inList.includes(String(docVal))) return false;
        }
        if (expected.$ne !== undefined && String(docVal) === String(this._extractIdOrPrimitive(expected.$ne))) return false;
        if (expected.$gte !== undefined && Number(docVal) < Number(expected.$gte)) return false;
        if (expected.$lte !== undefined && Number(docVal) > Number(expected.$lte)) return false;
        if (expected.$gt !== undefined && Number(docVal) <= Number(expected.$gt)) return false;
        if (expected.$lt !== undefined && Number(docVal) >= Number(expected.$lt)) return false;
        if (expected.$regex) {
          const reg = expected.$regex instanceof RegExp
            ? expected.$regex
            : new RegExp(expected.$regex, expected.$options || '');
          if (!reg.test(String(docVal || ''))) return false;
        }
      } else if (Array.isArray(rawDocVal)) {
        // Query for element in array: { participants: userId }
        const arr = rawDocVal.map((x) => String(this._extractIdOrPrimitive(x)));
        if (!arr.includes(String(expVal))) return false;
      } else if (expected !== undefined && expected !== null) {
        if (String(docVal) !== String(expVal)) return false;
      }
    }

    return true;
  }
}

export const modelRegistry = new Map();

export const createModel = (tableName, defaultValues = {}) => {
  const model = new SupabaseModel(tableName, defaultValues);
  modelRegistry.set(tableName, model);
  // Function wrapper to support: const user = new User({ ... })
  const ModelConstructor = function (data) {
    return model.new(data);
  };
  Object.setPrototypeOf(ModelConstructor, model);
  return ModelConstructor;
};

export default createModel;
