console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

let supabaseClient = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!window.Clerk) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }

  await window.Clerk.load();

  const session = window.Clerk.session;
  if (!session) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }

  const token = await session.getToken({ template: "supabase" });
  console.log('Clerk Supabase JWT:', token);

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  return supabaseClient;
}

// Example usage: get user data
async function getUser() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Supabase getUser error:', error);
    return null;
  }

  console.log('Supabase authenticated user:', data?.user);
  return data?.user;
}

// You can reuse getSupabaseClient() for orders, reviews, etc.

// --- Hook up your order and review modules here as needed ---

// Example: wire up reviews form submit
async function wireUpReviewForms() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    document.querySelectorAll('form.review-form').forEach(form => {
      form.innerHTML = `<div>Please log in to leave a review.</div>`;
    });
    return;
  }

  document.querySelectorAll('form.review-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const textarea = form.querySelector('textarea');
      if (!textarea || !textarea.value.trim()) return;

      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        text: textarea.value.trim(),
        // add other fields as needed
      });

      if (error) {
        alert('Failed to submit review: ' + error.message);
        return;
      }

      alert('Thanks for your review!');
      form.reset();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireUpReviewForms();
});
