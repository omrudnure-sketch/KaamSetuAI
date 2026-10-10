// Supabase-backed ProgressUpdate Model
import createModel from './supabaseModel.js';

const ProgressUpdate = createModel('progress_updates', {
  projectId: null,
  projectWorkerId: null,
  workerId: null,
  date: new Date().toISOString().split('T')[0],
  percentage: 0,
  description: '',
  tasksCompleted: [],
  blockers: [],
  expectedCompletionDate: null,
  photos: [],
});

export default ProgressUpdate;
