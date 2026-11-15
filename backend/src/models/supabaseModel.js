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
    if (key === '_id' || key === 'id') {
      const scalarId = typeof val === 'object' && val !== null ? (val.id || val._id || '') : val;
      res['id'] = scalarId ? String(scalarId) : undefined;
    } else if (key === 'createdFromHiringAgreement') {
      const scalarId = typeof val === 'object' && val !== null ? (val.id || val._id || val) : val;
      res['hiring_agreement_id'] = scalarId ? String(scalarId) : null;
    } else if (key === 'name' && obj.title === undefined) {
      res['title'] = val;
      res['name'] = val;
    } else if (key === 'estimatedEndDate' && obj.expectedEndDate === undefined) {
      res['expected_end_date'] = val;
    } else if (key === 'location' && typeof val === 'object' && val !== null) {
      if (val.city && res.city === undefined) res.city = val.city;
      if (val.area && res.area === undefined) res.area = val.area;
      if (val.address && res.address === undefined) res.address = val.address;
      if (Array.isArray(val.coordinates) && val.coordinates.length >= 2) {
        if (res.longitude === undefined) res.longitude = val.coordinates[0];
        if (res.latitude === undefined) res.latitude = val.coordinates[1];
      } else if (val.coordinates?.coordinates && Array.isArray(val.coordinates.coordinates)) {
        if (res.longitude === undefined) res.longitude = val.coordinates.coordinates[0];
        if (res.latitude === undefined) res.latitude = val.coordinates.coordinates[1];
      }
      res['location'] = typeof val === 'string' ? val : ([val.area, val.city].filter(Boolean).join(', ') || val.address || '');
    } else if (key === 'participants' && Array.isArray(val)) {
      if (!res.participant_a && val[0]) res.participant_a = String(val[0]?._id || val[0]?.id || val[0]);
      if (!res.participant_b && val[1]) res.participant_b = String(val[1]?._id || val[1]?.id || val[1]);
    } else if (key === 'employerId' || key === 'employer_id' || key === 'payerId' || key === 'payer_id') {
      const scalarId = typeof val === 'object' && val !== null ? (val.id || val._id || '') : val;
      const strId = scalarId ? String(scalarId) : null;
      if (strId) {
        res['employer_id'] = strId;
        res['payer_id'] = strId;
      } else {
        if (!res['employer_id']) res['employer_id'] = null;
        if (!res['payer_id']) res['payer_id'] = null;
      }
    } else if (key === 'workerId' || key === 'worker_id' || key === 'payeeId' || key === 'payee_id') {
      const scalarId = typeof val === 'object' && val !== null ? (val.id || val._id || '') : val;
      const strId = scalarId ? String(scalarId) : null;
      if (strId) {
        res['worker_id'] = strId;
        res['payee_id'] = strId;
      } else {
        if (!res['worker_id']) res['worker_id'] = null;
        if (!res['payee_id']) res['payee_id'] = null;
      }
    } else if (key === 'status') {
      let st = val;
      if (st === 'recorded') st = 'completed';
      res['status'] = st;
    } else if (key === 'percentage' || key === 'completionPercentage' || key === 'completion_percentage') {
      const pct = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
      res['completion_percentage'] = pct;
      res['percentage'] = pct;
    } else if (key === 'description' || key === 'summary') {
      res['description'] = val;
      if (!res['summary']) res['summary'] = val;
    } else if (key === 'previousEndDate' || key === 'previous_end_date' || key === 'originalEndDate' || key === 'original_end_date') {
      res['original_end_date'] = val;
      res['previous_end_date'] = val;
    } else if (key === 'requestedEndDate' || key === 'requested_end_date' || key === 'newEndDate' || key === 'new_end_date') {
      res['new_end_date'] = val;
      res['requested_end_date'] = val;
    } else if (key === 'additionalDays' || key === 'additional_days') {
      res['additional_days'] = Math.max(1, Number(val) || 1);
    } else if (key === 'type' || key === 'wageType' || key === 'wage_type') {
      let wt = val;
      if (!['daily', 'hourly', 'milestone', 'fixed'].includes(wt)) {
        wt = wt === 'weekly' ? 'daily' : 'milestone';
      }
      res['wage_type'] = wt;
      res['type'] = val;
    } else if (key === 'reference' || key === 'transactionRef' || key === 'transaction_ref') {
      res['transaction_ref'] = val;
      res['reference'] = val;
    } else if (key.startsWith('$')) {
      // Ignore Mongo operator wrappers like $set
      if (typeof val === 'object' && val !== null) {
        Object.assign(res, mapObjectToSnake(val));
      }
    } else {
      const snakeKey = camelToSnake(key);
      const isRelationalField =
        key.endsWith('Id') ||
        key.endsWith('_id') ||
        snakeKey.endsWith('_id') ||
        [
          'participant_a',
          'participant_b',
          'initiated_by',
          'sender_id',
          'receiver_id',
          'reviewer_id',
          'reviewee_id',
          'payer_id',
          'payee_id',
          'claimant_id',
          'respondent_id',
          'assigned_admin_id',
          'approved_by',
          'requested_by',
        ].includes(snakeKey);

      if (isRelationalField && typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const extracted = val.id || val._id;
        res[snakeKey] = extracted ? String(extracted) : null;
      } else {
        res[snakeKey] = val;
      }
    }
  }

  // Auto-calculate additional_days if original_end_date & new_end_date are present
  if (res['original_end_date'] && res['new_end_date'] && !res['additional_days']) {
    try {
      const diffMs = new Date(res['new_end_date']).getTime() - new Date(res['original_end_date']).getTime();
      res['additional_days'] = Math.max(1, Math.round(diffMs / 86400000));
    } catch (_e) {
      res['additional_days'] = 1;
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
  // Cross-compatibility mappings for payments, progress, extensions
  if (res.payerId !== undefined) {
    res.employerId = String(res.payerId);
  } else if (res.employerId !== undefined) {
    res.payerId = String(res.employerId);
  }
  if (res.payeeId !== undefined) {
    res.workerId = String(res.payeeId);
  } else if (res.workerId !== undefined) {
    res.payeeId = String(res.workerId);
  }
  if (res.wageType !== undefined) {
    res.type = res.wageType;
  } else if (res.type !== undefined) {
    res.wageType = res.type;
  }
  if (res.transactionRef !== undefined) {
    res.reference = res.transactionRef;
  } else if (res.reference !== undefined) {
    res.transactionRef = res.reference;
  }
  if (res.completionPercentage !== undefined) {
    res.percentage = Number(res.completionPercentage);
  } else if (res.percentage !== undefined) {
    res.completionPercentage = Number(res.percentage);
  }
  if (res.summary !== undefined && !res.description) {
    res.description = res.summary;
  }
  if (res.description !== undefined && !res.summary) {
    res.summary = res.description;
  }
  if (res.originalEndDate !== undefined) {
    res.previousEndDate = res.originalEndDate;
  } else if (res.previousEndDate !== undefined) {
    res.originalEndDate = res.previousEndDate;
  }
  if (res.newEndDate !== undefined) {
    res.requestedEndDate = res.newEndDate;
  } else if (res.requestedEndDate !== undefined) {
    res.newEndDate = res.requestedEndDate;
  }
  if (res.additionalDays !== undefined) {
    res.additionalDays = Number(res.additionalDays);
  }
  if (res.participantA && res.participantB && (!res.participants || !res.participants.length)) {
    res.participants = [String(res.participantA), String(res.participantB)];
  }
  return res;
};

// Verified column whitelist per Supabase table to prevent PostgREST PGRST204 errors
export const SUPABASE_TABLE_COLUMNS = {
  users: new Set(['id', 'name', 'email', 'phone', 'password_hash', 'role', 'admin_role', 'permissions', 'preferred_language', 'status', 'is_verified', 'last_login_at', 'created_at', 'updated_at']),
  worker_profiles: new Set([
    'id', 'user_id', 'full_name', 'bio', 'primary_skill', 'skills', 'experience_years', 'daily_wage', 'hourly_rate',
    'languages', 'preferred_work_type', 'availability', 'is_available_for_work', 'availability_updated_at',
    'service_radius_km', 'profile_photo', 'documents', 'location', 'city', 'area', 'address', 'pincode',
    'latitude', 'longitude', 'profile_completion', 'rating', 'review_count', 'completed_projects',
    'created_at', 'updated_at'
  ]),
  employer_profiles: new Set([
    'id', 'user_id', 'company_name', 'business_type', 'contact_person', 'location', 'city', 'area',
    'address', 'pincode', 'phone', 'email', 'profile_completion', 'rating', 'review_count',
    'created_at', 'updated_at'
  ]),
  jobs: new Set([
    'id', 'employer_id', 'title', 'description', 'category', 'required_skills', 'wage_type', 'wage_amount',
    'duration_days', 'location', 'city', 'area', 'address', 'pincode', 'latitude', 'longitude',
    'workers_needed', 'status', 'ai_generated', 'created_at', 'updated_at'
  ]),
  job_applications: new Set(['id', 'job_id', 'worker_id', 'proposed_wage', 'cover_note', 'status', 'applied_at', 'updated_at']),
  job_invitations: new Set(['id', 'job_id', 'worker_id', 'employer_id', 'status', 'created_at', 'updated_at']),
  hiring_agreements: new Set(['id', 'job_id', 'employer_id', 'worker_id', 'agreed_wage', 'wage_type', 'start_date', 'expected_end_date', 'terms', 'proposed_by', 'status', 'confirmed_at', 'created_at', 'updated_at']),
  projects: new Set(['id', 'hiring_agreement_id', 'employer_id', 'title', 'description', 'location', 'start_date', 'expected_end_date', 'actual_end_date', 'payment_amount', 'status', 'completion_requested_by', 'created_at', 'updated_at']),
  project_workers: new Set(['id', 'project_id', 'worker_id', 'hiring_agreement_id', 'agreed_wage', 'wage_type', 'status', 'joined_at']),
  progress_updates: new Set([
    'id', 'project_id', 'worker_id', 'date', 'completion_percentage', 'summary', 'description',
    'tasks_completed', 'blockers', 'expected_completion_date', 'photos', 'created_at'
  ]),
  project_extensions: new Set([
    'id', 'project_id', 'requested_by', 'additional_days', 'reason', 'original_end_date', 'new_end_date',
    'status', 'approved_by', 'created_at', 'updated_at', 'proposed_wage', 'project_worker_id'
  ]),
  payments: new Set([
    'id', 'project_id', 'payer_id', 'payee_id', 'amount', 'wage_type', 'status',
    'payment_date', 'transaction_ref', 'notes', 'created_at'
  ]),
  reviews: new Set(['id', 'project_id', 'reviewer_id', 'reviewee_id', 'rating', 'comment', 'created_at']),
  messages: new Set(['id', 'conversation_id', 'sender_id', 'receiver_id', 'message_type', 'content', 'attachment_url', 'attachment_name', 'attachment_size', 'duration', 'attachments', 'is_read', 'read_at', 'created_at']),
  conversations: new Set(['id', 'participant_a', 'participant_b', 'related_project_id', 'project_id', 'job_id', 'conversation_type', 'last_message', 'last_message_at', 'status', 'initiated_by', 'request_message', 'accepted_at', 'rejected_at', 'created_at', 'updated_at']),
  notifications: new Set(['id', 'user_id', 'type', 'title', 'message', 'is_read', 'data', 'created_at']),
  complaints: new Set(['id', 'filed_by', 'against_user', 'against_user_id', 'project_id', 'category', 'description', 'status', 'assigned_admin_id', 'resolution_notes', 'resolved_at', 'created_at', 'updated_at']),
  disputes: new Set(['id', 'complaint_id', 'project_id', 'claimant_id', 'respondent_id', 'assigned_admin_id', 'status', 'resolution_notes', 'resolved_at', 'created_at', 'updated_at']),
  verification_records: new Set(['id', 'user_id', 'document_type', 'document_number', 'status', 'verified_by', 'verified_at', 'created_at']),
  risk_flags: new Set(['id', 'user_id', 'risk_score', 'factors', 'flagged_at']),
  attendances: new Set(['id', 'project_id', 'worker_id', 'date', 'check_in_time', 'check_out_time', 'status', 'created_at']),
  audit_logs: new Set(['id', 'admin_id', 'action', 'entity_type', 'entity_id', 'details', 'created_at']),
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
    const configs = Array.isArray(config) ? config.flat(Infinity) : [config];
    await this._model._applyPopulate([this], configs);
    return this;
  }
}

// In-Memory store per table for offline testing and fixtures, with local file persistence in dev mode
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DEV_STORE_PATH = path.resolve(__dirname, '../../.local_dev_store.json');

const globalInMemoryStores = new Map();
let isStoreInitialized = false;

const loadLocalDevStore = () => {
  if (isStoreInitialized) return;
  isStoreInitialized = true;
  if (process.env.NODE_ENV === 'test') return;

  try {
    if (fs.existsSync(LOCAL_DEV_STORE_PATH)) {
      const content = fs.readFileSync(LOCAL_DEV_STORE_PATH, 'utf-8');
      if (content.trim()) {
        const raw = JSON.parse(content);
        for (const [table, records] of Object.entries(raw)) {
          const tableMap = new Map();
          if (Array.isArray(records)) {
            for (const item of records) {
              const id = String(item.id || item._id);
              tableMap.set(id, item);
            }
          }
          globalInMemoryStores.set(table, tableMap);
        }
      }
    }
  } catch (err) {
    console.warn('[KaamSetu AI] Local dev store load warning:', err.message);
  }
};

const saveLocalDevStore = () => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const serialized = {};
    for (const [table, map] of globalInMemoryStores.entries()) {
      serialized[table] = Array.from(map.values()).map((doc) =>
        doc.toJSON ? doc.toJSON() : doc
      );
    }
    fs.writeFileSync(LOCAL_DEV_STORE_PATH, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[KaamSetu AI] Local dev store save warning:', err.message);
  }
};

export const getInMemoryStore = (tableName) => {
  loadLocalDevStore();
  if (!globalInMemoryStores.has(tableName)) {
    globalInMemoryStores.set(tableName, new Map());
  }
  return globalInMemoryStores.get(tableName);
};

export const clearAllInMemoryStores = () => {
  for (const store of globalInMemoryStores.values()) {
    store.clear();
  }
  if (process.env.NODE_ENV !== 'test') {
    try {
      if (fs.existsSync(LOCAL_DEV_STORE_PATH)) {
        fs.unlinkSync(LOCAL_DEV_STORE_PATH);
      }
    } catch (_err) {}
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
    if (Array.isArray(config)) {
      this.populateConfigs.push(...config);
    } else if (config) {
      this.populateConfigs.push(config);
    }
    return this;
  }

  lean() {
    this.isLean = true;
    return this;
  }

  getFilter() {
    return this.filter;
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

        // Omit null/undefined values on insert so PostgreSQL defaults apply safely
        for (const [k, v] of Object.entries(validColumnsData)) {
          if (v === null || v === undefined) {
            delete validColumnsData[k];
          }
        }

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

          // Auto-heal schema cache errors and enum mismatches
          let currentError = error;
          let retryCount = 0;
          while (currentError && retryCount < 20) {
            if (currentError.message?.includes('invalid input value for enum payment_status')) {
              validColumnsData['status'] = 'completed';
              retryCount++;
              const retryRes = await supabaseAdmin
                .from(this.tableName)
                .insert(validColumnsData)
                .select()
                .single();
              if (!retryRes.error && retryRes.data) {
                const doc = new SupabaseDocument(mapObjectToCamel(retryRes.data), this);
                getInMemoryStore(this.tableName).set(doc.id, doc);
                return doc;
              }
              currentError = retryRes.error;
              continue;
            }

            const colMatch =
              currentError.message?.match(/Could not find the '([^']+)' column/i) ||
              currentError.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
            if (colMatch && colMatch[1]) {
              const missingCol = colMatch[1];
              console.warn(`[Supabase Auto-Heal]: Column '${missingCol}' missing in '${this.tableName}'. Removing and retrying insert...`);
              if (SUPABASE_TABLE_COLUMNS[this.tableName]) {
                SUPABASE_TABLE_COLUMNS[this.tableName].delete(missingCol);
              }
              delete validColumnsData[missingCol];
              retryCount++;
              const retryRes = await supabaseAdmin
                .from(this.tableName)
                .insert(validColumnsData)
                .select()
                .single();
              if (!retryRes.error && retryRes.data) {
                const doc = new SupabaseDocument(mapObjectToCamel(retryRes.data), this);
                getInMemoryStore(this.tableName).set(doc.id, doc);
                return doc;
              }
              currentError = retryRes.error;
            } else {
              break;
            }
          }

          console.warn(`[Supabase ${this.tableName} Insert Notice]:`, error.message || error.code);
          if (process.env.NODE_ENV === 'production') {
            throw new Error(`Database insert failed for ${this.tableName}: ${currentError?.message || error.message}`);
          }
        } else if (inserted) {
          const doc = new SupabaseDocument(mapObjectToCamel(inserted), this);
          getInMemoryStore(this.tableName).set(doc.id, doc);
          return doc;
        }
      } catch (err) {
        if (err.code === '23505') throw err;
        console.warn(`[Supabase ${this.tableName} Fallback Notice]:`, err.message);
        if (process.env.NODE_ENV === 'production') {
          throw err;
        }
      }
    }

    // In-memory persistence
    const doc = new SupabaseDocument(docData, this);
    getInMemoryStore(this.tableName).set(doc.id, doc);
    saveLocalDevStore();
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
        } else if (error) {
          let currentError = error;
          let retryCount = 0;
          while (currentError && retryCount < 20) {
            if (currentError.message?.includes('invalid input value for enum payment_status')) {
              validColumnsData['status'] = 'completed';
              retryCount++;
              const retryRes = await supabaseAdmin
                .from(this.tableName)
                .update(validColumnsData)
                .eq('id', existing.id)
                .select()
                .single();
              if (!retryRes.error && retryRes.data) {
                const doc = new SupabaseDocument(mapObjectToCamel(retryRes.data), this);
                getInMemoryStore(this.tableName).set(doc.id, doc);
                return options.new === false ? existing : doc;
              }
              currentError = retryRes.error;
              continue;
            }

            const colMatch =
              currentError.message?.match(/Could not find the '([^']+)' column/i) ||
              currentError.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
            if (colMatch && colMatch[1]) {
              const missingCol = colMatch[1];
              console.warn(`[Supabase Auto-Heal]: Column '${missingCol}' missing in table '${this.tableName}'. Removing and retrying update...`);
              if (SUPABASE_TABLE_COLUMNS[this.tableName]) {
                SUPABASE_TABLE_COLUMNS[this.tableName].delete(missingCol);
              }
              delete validColumnsData[missingCol];
              retryCount++;
              const retryRes = await supabaseAdmin
                .from(this.tableName)
                .update(validColumnsData)
                .eq('id', existing.id)
                .select()
                .single();
              if (!retryRes.error && retryRes.data) {
                const doc = new SupabaseDocument(mapObjectToCamel(retryRes.data), this);
                getInMemoryStore(this.tableName).set(doc.id, doc);
                return options.new === false ? existing : doc;
              }
              currentError = retryRes.error;
            } else {
              break;
            }
          }
          if (process.env.NODE_ENV === 'production') {
            console.error(`[Supabase ${this.tableName} update error]:`, currentError?.message || error.message);
            throw new Error(`Database update failed for ${this.tableName}: ${currentError?.message || error.message}`);
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          console.error(`[Supabase ${this.tableName} update fatal]:`, err.message);
          throw err;
        }
      }
    }

    const doc = new SupabaseDocument(merged, this);
    getInMemoryStore(this.tableName).set(doc.id, doc);
    saveLocalDevStore();
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
    saveLocalDevStore();
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

  // Evaluate MongoDB-style aggregation expression on a document
  _evaluateExpression(doc, expr) {
    if (expr === null || expr === undefined) return null;
    if (typeof expr === 'string') {
      if (expr.startsWith('$')) {
        const field = expr.slice(1);
        return this._getNestedValue(doc, field);
      }
      return expr;
    }
    if (typeof expr === 'number' || typeof expr === 'boolean') {
      return expr;
    }
    if (Array.isArray(expr)) {
      return expr.map((e) => this._evaluateExpression(doc, e));
    }
    if (typeof expr === 'object') {
      if (expr.$ifNull !== undefined) {
        if (Array.isArray(expr.$ifNull)) {
          const primary = this._evaluateExpression(doc, expr.$ifNull[0]);
          if (primary !== null && primary !== undefined && primary !== '') {
            return primary;
          }
          return this._evaluateExpression(doc, expr.$ifNull[1]);
        } else {
          const primary = this._evaluateExpression(doc, expr.$ifNull);
          if (primary !== null && primary !== undefined && primary !== '') {
            return primary;
          }
          return null;
        }
      }
      if (expr.$toLower !== undefined) {
        const val = this._evaluateExpression(doc, expr.$toLower);
        return val ? String(val).toLowerCase() : '';
      }
      if (expr.$toUpper !== undefined) {
        const val = this._evaluateExpression(doc, expr.$toUpper);
        return val ? String(val).toUpperCase() : '';
      }
      if (expr.$cond !== undefined) {
        let cond, trueVal, falseVal;
        if (Array.isArray(expr.$cond)) {
          [cond, trueVal, falseVal] = expr.$cond;
        } else if (typeof expr.$cond === 'object' && expr.$cond !== null) {
          cond = expr.$cond.if;
          trueVal = expr.$cond.then;
          falseVal = expr.$cond.else;
        }
        let condResult = false;
        if (typeof cond === 'object' && cond !== null) {
          if (cond.$eq !== undefined && Array.isArray(cond.$eq)) {
            const [a, b] = cond.$eq.map((x) => this._evaluateExpression(doc, x));
            condResult = a === b;
          } else if (cond.$ne !== undefined && Array.isArray(cond.$ne)) {
            const [a, b] = cond.$ne.map((x) => this._evaluateExpression(doc, x));
            condResult = a !== b;
          } else if (cond.$gt !== undefined && Array.isArray(cond.$gt)) {
            const [a, b] = cond.$gt.map((x) => this._evaluateExpression(doc, x));
            condResult = Number(a) > Number(b);
          } else if (cond.$gte !== undefined && Array.isArray(cond.$gte)) {
            const [a, b] = cond.$gte.map((x) => this._evaluateExpression(doc, x));
            condResult = Number(a) >= Number(b);
          } else {
            condResult = Boolean(this._evaluateExpression(doc, cond));
          }
        } else {
          condResult = Boolean(this._evaluateExpression(doc, cond));
        }
        return condResult
          ? this._evaluateExpression(doc, trueVal)
          : this._evaluateExpression(doc, falseVal);
      }

      // Compound dictionary object like { city: expr1, skill: expr2 }
      const res = {};
      for (const [k, v] of Object.entries(expr)) {
        res[k] = this._evaluateExpression(doc, v);
      }
      return res;
    }
    return expr;
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

        for (const doc of items) {
          let evaluatedId = this._evaluateExpression(doc, groupSpec._id);
          if (evaluatedId && typeof evaluatedId === 'object') {
            if (evaluatedId.$ifNull) {
              evaluatedId = Array.isArray(evaluatedId.$ifNull)
                ? (evaluatedId.$ifNull[1] || 'Unspecified')
                : 'Unspecified';
            } else if (evaluatedId.city && typeof evaluatedId.city === 'object' && evaluatedId.city.$ifNull) {
              evaluatedId.city = Array.isArray(evaluatedId.city.$ifNull)
                ? (evaluatedId.city.$ifNull[1] || 'Unspecified')
                : 'Unspecified';
            }
          }
          const groupKey =
            typeof evaluatedId === 'object' && evaluatedId !== null
              ? JSON.stringify(evaluatedId)
              : String(evaluatedId ?? 'null');

          if (!groups.has(groupKey)) {
            groups.set(groupKey, { _id: evaluatedId, _count: 0, _docs: [] });
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
                } else {
                  res[outField] = groupObj._docs.reduce((sum, d) => {
                    const val = this._evaluateExpression(d, accumulator.$sum);
                    return sum + Number(val || 0);
                  }, 0);
                }
              } else if (accumulator.$avg !== undefined) {
                const values = groupObj._docs
                  .map((d) => this._evaluateExpression(d, accumulator.$avg))
                  .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));
                const total = values.reduce((sum, v) => sum + Number(v), 0);
                res[outField] = values.length > 0 ? total / values.length : 0;
              } else if (accumulator.$push !== undefined) {
                res[outField] = groupObj._docs.map((d) =>
                  this._evaluateExpression(d, accumulator.$push)
                );
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
          let snakeKey = k === '_id' ? 'id' : camelToSnake(k);
          if (snakeKey === 'location.city' || snakeKey === 'location_city') snakeKey = 'city';
          if (snakeKey === 'location.area' || snakeKey === 'location_area') snakeKey = 'area';

          if (this.tableName === 'payments') {
            if (snakeKey === 'employer_id' || k === 'employerId' || k === 'payerId') snakeKey = 'payer_id';
            if (snakeKey === 'worker_id' || k === 'workerId' || k === 'payeeId') snakeKey = 'payee_id';
            if (snakeKey === 'type' || k === 'type' || k === 'wageType') snakeKey = 'wage_type';
            if (snakeKey === 'reference' || k === 'reference' || k === 'transactionRef') snakeKey = 'transaction_ref';
          }
          if (this.tableName === 'progress_updates') {
            if (snakeKey === 'percentage' || k === 'percentage' || k === 'completionPercentage') snakeKey = 'completion_percentage';
          }
          if (this.tableName === 'project_extensions') {
            if (snakeKey === 'previous_end_date' || k === 'previousEndDate' || k === 'originalEndDate') snakeKey = 'original_end_date';
            if (snakeKey === 'requested_end_date' || k === 'requestedEndDate' || k === 'newEndDate') snakeKey = 'new_end_date';
            if (snakeKey === 'additional_days' || k === 'additionalDays') snakeKey = 'additional_days';
          }

          if (this.tableName === 'conversations' && (k === 'participants' || snakeKey === 'participants')) {
            if (v && v.$all && Array.isArray(v.$all) && v.$all.length >= 2) {
              const p1 = String(v.$all[0]?._id || v.$all[0]?.id || v.$all[0]);
              const p2 = String(v.$all[1]?._id || v.$all[1]?.id || v.$all[1]);
              sbQuery = sbQuery.or(`and(participant_a.eq.${p1},participant_b.eq.${p2}),and(participant_a.eq.${p2},participant_b.eq.${p1})`);
              continue;
            } else if (v && !v.$all) {
              const pid = String(v?._id || v?.id || v);
              sbQuery = sbQuery.or(`participant_a.eq.${pid},participant_b.eq.${pid}`);
              continue;
            }
          }
          if (v !== undefined && v !== null) {
            const formatVal = (val) => (val instanceof Date ? val.toISOString() : val);
            if (v instanceof RegExp) {
              const cleanPattern = v.source.replace(/^\^/, '').replace(/\$$/, '');
              sbQuery = sbQuery.ilike(snakeKey, `%${cleanPattern}%`);
            } else if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
              if (v.$regex) {
                const pat = (v.$regex.source || v.$regex).replace(/^\^/, '').replace(/\$$/, '');
                sbQuery = sbQuery.ilike(snakeKey, `%${pat}%`);
              }
              if (v.$gte !== undefined) sbQuery = sbQuery.gte(snakeKey, formatVal(v.$gte));
              if (v.$lte !== undefined) sbQuery = sbQuery.lte(snakeKey, formatVal(v.$lte));
              if (v.$gt !== undefined) sbQuery = sbQuery.gt(snakeKey, formatVal(v.$gt));
              if (v.$lt !== undefined) sbQuery = sbQuery.lt(snakeKey, formatVal(v.$lt));
              if (v.$in !== undefined) sbQuery = sbQuery.in(snakeKey, Array.isArray(v.$in) ? v.$in.map(formatVal) : v.$in);
              if (v.$ne !== undefined) sbQuery = sbQuery.neq(snakeKey, formatVal(v.$ne));
            } else {
              sbQuery = sbQuery.eq(snakeKey, formatVal(v));
            }
          }
        }

        if (isSingle) {
          const { data: singleRow, error } = await sbQuery.maybeSingle();
          if (!error && singleRow) {
            queriedFromSupabase = true;
            items = [new SupabaseDocument(mapObjectToCamel(singleRow), this)];
          }
        } else {
          const { data: rows, error } = await sbQuery;
          if (!error && rows && rows.length > 0) {
            queriedFromSupabase = true;
            items = rows.map((r) => new SupabaseDocument(mapObjectToCamel(r), this));
          }
        }
      } catch (err) {
        queriedFromSupabase = false;
        if (process.env.NODE_ENV === 'production') {
          console.error(`[Supabase ${this.tableName} query error]:`, err.message);
          throw new Error(`Database query failed for ${this.tableName}`);
        }
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
    const flatConfigs = (Array.isArray(populateConfigs) ? populateConfigs : [populateConfigs]).flat(Infinity).filter(Boolean);
    const tableFieldMap = {
      employerId: 'users',
      workerId: 'users',
      userId: 'users',
      reviewerId: 'users',
      reviewedBy: 'users',
      revieweeId: 'users',
      againstUser: 'users',
      againstUserId: 'users',
      filedBy: 'users',
      senderId: 'users',
      receiverId: 'users',
      requestedBy: 'users',
      approvedBy: 'users',
      verifiedBy: 'users',
      payerId: 'users',
      payeeId: 'users',
      claimantId: 'users',
      respondentId: 'users',
      initiatedBy: 'users',
      assignedAdminId: 'users',
      participantA: 'users',
      participantB: 'users',
      participants: 'users',
      jobId: 'jobs',
      projectId: 'projects',
      relatedProjectId: 'projects',
      hiringAgreementId: 'hiring_agreements',
      projectWorkerId: 'project_workers',
      conversationId: 'conversations',
    };

    for (const config of flatConfigs) {
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
              let populatedDoc = await targetModel.findById(elId);
              if (!populatedDoc) {
                populatedDoc = getInMemoryStore(targetTable).get(String(elId));
              }
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
              } else {
                populatedList.push(element);
              }
            } catch (_err) {
              populatedList.push(element);
            }
          }
          item[path] = populatedList;
          continue;
        }

        const refId = typeof refVal === 'object' ? (refVal.id || refVal._id) : refVal;
        if (!refId) continue;

        try {
          let populatedDoc = await targetModel.findById(refId);
          if (!populatedDoc) {
            populatedDoc = getInMemoryStore(targetTable).get(String(refId));
          }
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
    if (path === 'location.city') return doc.city || doc.location?.city;
    if (path === 'location.area') return doc.area || doc.location?.area;
    if (path === 'employerId' || path === 'payerId' || path === 'payer_id' || path === 'employer_id') {
      return doc.payerId ?? doc.payer_id ?? doc.employerId ?? doc.employer_id;
    }
    if (path === 'workerId' || path === 'payeeId' || path === 'payee_id' || path === 'worker_id') {
      return doc.payeeId ?? doc.payee_id ?? doc.workerId ?? doc.worker_id;
    }
    if (path === 'percentage' || path === 'completionPercentage' || path === 'completion_percentage') {
      return doc.completionPercentage ?? doc.completion_percentage ?? doc.percentage;
    }
    if (path === 'previousEndDate' || path === 'originalEndDate' || path === 'original_end_date' || path === 'previous_end_date') {
      return doc.originalEndDate ?? doc.original_end_date ?? doc.previousEndDate ?? doc.previous_end_date;
    }
    if (path === 'requestedEndDate' || path === 'newEndDate' || path === 'new_end_date' || path === 'requested_end_date') {
      return doc.newEndDate ?? doc.new_end_date ?? doc.requestedEndDate ?? doc.requested_end_date;
    }
    if (!path.includes('.')) {
      if (doc[path] !== undefined) return doc[path];
      const camel = snakeToCamel(path);
      if (doc[camel] !== undefined) return doc[camel];
      const snake = camelToSnake(path);
      if (doc[snake] !== undefined) return doc[snake];
      return undefined;
    }
    const parts = path.split('.');
    let curr = doc;
    for (const p of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[p] !== undefined ? curr[p] : curr[snakeToCamel(p)];
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

      const nested = this._getNestedValue(doc, key);
      const rawDocVal =
        nested !== undefined
          ? nested
          : (key === 'participants' && doc.participantA && doc.participantB ? [doc.participantA, doc.participantB] : undefined);
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
        const toComparable = (val) => {
          if (val === undefined || val === null) return val;
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'string') {
            const parsed = Date.parse(val);
            if (!isNaN(parsed) && (val.includes('-') || val.includes(':'))) {
              return parsed;
            }
            const num = Number(val);
            if (!isNaN(num) && val.trim() !== '') return num;
          }
          if (typeof val === 'number') return val;
          return val;
        };
        if (expected.$gte !== undefined && toComparable(docVal) < toComparable(expected.$gte)) return false;
        if (expected.$lte !== undefined && toComparable(docVal) > toComparable(expected.$lte)) return false;
        if (expected.$gt !== undefined && toComparable(docVal) <= toComparable(expected.$gt)) return false;
        if (expected.$lt !== undefined && toComparable(docVal) >= toComparable(expected.$lt)) return false;
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
      } else if (expected === null) {
        if (docVal !== null && docVal !== undefined) return false;
      } else if (expected !== undefined) {
        if (docVal === null || docVal === undefined) return false;
        if (String(docVal).toLowerCase() !== String(expVal).toLowerCase()) return false;
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
