import { Job, WorkerProfile, HiringAgreement, Project } from '../models/index.js';
import { parseDateRange } from '../utils/dateFilter.js';

export const getSkillAnalytics = async (query = {}) => {
  const { dateRangeLabel } = parseDateRange(query);

  const [allJobs, allWorkers, allAgreements, allProjects] = await Promise.all([
    Job.find({}).lean(),
    WorkerProfile.find({}).lean(),
    HiringAgreement.find({}).lean(),
    Project.find({}).lean(),
  ]);

  const skillMap = {};

  const ensureSkill = (skill) => {
    if (!skill || typeof skill !== 'string') return null;
    const key = skill.trim().toLowerCase();
    if (!key) return null;
    if (!skillMap[key]) {
      skillMap[key] = {
        skill: key,
        openJobs: 0,
        relevantWorkers: 0,
        availableWorkers: 0,
        hires: 0,
        completedProjects: 0,
        advertisedWages: [],
        agreedWages: [],
      };
    }
    return skillMap[key];
  };

  const jobMap = new Map();
  for (const j of allJobs) {
    const jId = String(j.id || j._id);
    jobMap.set(jId, j);

    const skills = new Set();
    if (j.skillRequired && typeof j.skillRequired === 'string') {
      skills.add(j.skillRequired.trim().toLowerCase());
    }
    if (j.category && typeof j.category === 'string') {
      skills.add(j.category.trim().toLowerCase());
    }
    if (Array.isArray(j.requiredSkills)) {
      for (const s of j.requiredSkills) {
        if (typeof s === 'string' && s.trim()) skills.add(s.trim().toLowerCase());
      }
    }

    if (j.status === 'open') {
      for (const skillName of skills) {
        const s = ensureSkill(skillName);
        if (s) {
          s.openJobs++;
          if (j.wageAmount && Number(j.wageAmount) > 0) {
            s.advertisedWages.push(Number(j.wageAmount));
          }
        }
      }
    }
  }

  for (const w of allWorkers) {
    const workerSkills = new Set();
    if (w.primarySkill && typeof w.primarySkill === 'string') {
      workerSkills.add(w.primarySkill.trim().toLowerCase());
    }
    if (Array.isArray(w.skills)) {
      for (const s of w.skills) {
        if (typeof s === 'string' && s.trim()) workerSkills.add(s.trim().toLowerCase());
      }
    }

    const isAvailable = w.availability === 'available';
    for (const skillName of workerSkills) {
      const s = ensureSkill(skillName);
      if (s) {
        s.relevantWorkers++;
        if (isAvailable) {
          s.availableWorkers++;
        }
      }
    }
  }

  const agreementMap = new Map();
  for (const h of allAgreements) {
    const hId = String(h.id || h._id);
    agreementMap.set(hId, h);

    if (h.status === 'confirmed') {
      const jobId = String(h.jobId?._id || h.jobId?.id || h.jobId || '');
      const job = jobMap.get(jobId);
      if (job) {
        const jobSkills = new Set();
        if (job.skillRequired && typeof job.skillRequired === 'string') {
          jobSkills.add(job.skillRequired.trim().toLowerCase());
        }
        if (job.category && typeof job.category === 'string') {
          jobSkills.add(job.category.trim().toLowerCase());
        }
        if (Array.isArray(job.requiredSkills)) {
          for (const s of job.requiredSkills) {
            if (typeof s === 'string') jobSkills.add(s.trim().toLowerCase());
          }
        }
        for (const skillName of jobSkills) {
          const s = ensureSkill(skillName);
          if (s) {
            s.hires++;
            if (h.agreedWage && Number(h.agreedWage) > 0) {
              s.agreedWages.push(Number(h.agreedWage));
            }
          }
        }
      }
    }
  }

  for (const p of allProjects) {
    if (p.status === 'completed') {
      let job = null;
      if (p.jobId) {
        job = jobMap.get(String(p.jobId._id || p.jobId.id || p.jobId));
      } else if (p.hiringAgreementId) {
        const ag = agreementMap.get(String(p.hiringAgreementId._id || p.hiringAgreementId.id || p.hiringAgreementId));
        if (ag && ag.jobId) {
          job = jobMap.get(String(ag.jobId._id || ag.jobId.id || ag.jobId));
        }
      }
      if (job) {
        const jobSkills = new Set();
        if (job.skillRequired && typeof job.skillRequired === 'string') {
          jobSkills.add(job.skillRequired.trim().toLowerCase());
        }
        if (job.category && typeof job.category === 'string') {
          jobSkills.add(job.category.trim().toLowerCase());
        }
        if (Array.isArray(job.requiredSkills)) {
          for (const s of job.requiredSkills) {
            if (typeof s === 'string') jobSkills.add(s.trim().toLowerCase());
          }
        }
        for (const skillName of jobSkills) {
          const s = ensureSkill(skillName);
          if (s) s.completedProjects++;
        }
      }
    }
  }

  const skills = Object.values(skillMap).map((item) => {
    const demand = item.openJobs;
    const supply = item.availableWorkers;
    const gap = Math.max(0, demand - supply);

    const avgAdvertised =
      item.advertisedWages.length > 0
        ? Math.round(item.advertisedWages.reduce((a, b) => a + b, 0) / item.advertisedWages.length)
        : null;

    const avgAgreed =
      item.agreedWages.length > 0
        ? Math.round(item.agreedWages.reduce((a, b) => a + b, 0) / item.agreedWages.length)
        : null;

    return {
      skill: item.skill,
      openJobs: item.openJobs,
      relevantWorkers: item.relevantWorkers,
      availableWorkers: item.availableWorkers,
      hires: item.hires,
      completedProjects: item.completedProjects,
      avgAdvertisedWage: avgAdvertised ? `₹${avgAdvertised}` : 'N/A',
      avgAgreedWage: avgAgreed ? `₹${avgAgreed}` : 'N/A',
      demand,
      supply,
      gap,
      wageComparison: {
        advertised: avgAdvertised || 0,
        agreed: avgAgreed || 0,
        source: 'Advertised wage from Job.wageAmount; agreed wage from HiringAgreement.agreedWage',
      },
    };
  });

  return {
    dateRange: dateRangeLabel,
    skills,
    definitions: {
      demand: 'Number of open jobs requiring this skill.',
      supply: 'Number of registered workers with this skill whose status is currently "available" (excluding busy or unavailable workers).',
      relevantWorkers: 'Total registered workers with matching primary or secondary skill, regardless of current availability.',
      gap: 'Estimated shortage: max(0, Demand - Supply). Indicates unfilled demand exceeding available workers.',
      wages: 'Distinguishes advertised rate on open jobs from negotiated rate on confirmed hiring agreements.',
    },
  };
};

export default getSkillAnalytics;
