console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

// Create a single Supabase client instance
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Returns the Supabase client, setting the auth token from Clerk if available
 */
async function getSupabaseClient() {
  // If Clerk isn’t loaded or no session, return the anon client
  if (!window.Clerk) return supabase;
  await window.Clerk.load();

  const session = window.Clerk.session;
  if (!session) return supabase;

  // Get fresh Clerk JWT for Supabase
  const token = await session.getToken({ template: 'supabase' });
  console.log('Clerk Supabase JWT:', token);

  // Set the token for supabase-js auth module
  supabase.auth.setAuth(token);
  return supabase;
}

/**
 * Helper to fetch the authenticated user from Supabase
 */
async function getUser() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    console.error('Supabase getUser error:', error);
    return null;
  }
  console.log('Supabase authenticated user:', data?.user);
  return data?.user;
}

/**
 * Wires up review forms on the page
 */
async function wireUpReviewForms() {
  const client = await getSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    console.error('Error fetching user for reviews:', error);
  }

  document.querySelectorAll('form.review-form').forEach(form => {
    const textarea = form.querySelector('textarea');
    const submitHandler = async (e) => {
      e.preventDefault();
      if (!user) {
        form.innerHTML = '<div>Please log in to leave a review.</div>';
        return;
      }
      if (!textarea?.value.trim()) return;

      const { error: insertError } = await client.from('reviews').insert({
        user_id: user.id,
        text: textarea.value.trim(),
        // Add other fields as needed
      });

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        alert('Failed to submit review: ' + insertError.message);
      } else {
        alert('Thanks for your review!');
        form.reset();
      }
    };

    form.addEventListener('submit', submitHandler);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  wireUpReviewForms();
});
