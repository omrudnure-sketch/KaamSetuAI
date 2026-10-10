// Supabase-backed Review Model
import createModel from './supabaseModel.js';

const Review = createModel('reviews', {
  projectId: null,
  reviewerId: null,
  revieweeId: null,
  reviewerRole: 'employer',
  revieweeRole: 'worker',
  rating: 5,
  comment: '',
  status: 'published',
});

export default Review;
