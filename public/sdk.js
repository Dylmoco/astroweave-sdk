console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

// Use Supabase JS v2 for Clerk JWT support
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

// Utility: Always returns a NEW Supabase client with latest Clerk JWT in headers (per request)
async function getSupabaseClient() {
  if (!window.Clerk) return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  await window.Clerk.load();
  const session = window.Clerk.session;
  if (!session) return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const token = await session.getToken({ template: 'supabase' });
  console.log('Clerk Supabase JWT:', token);

  // Correct way for v2: inject JWT in headers
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Get Clerk user (async-safe)
  await window.Clerk?.load();
  const clerkUser = window.Clerk?.session?.user;

  // Find and render order/review cards
  const orderCards = document.querySelectorAll('.order-card[data-astroweave-order]');
  orderCards.forEach(card => {
    // Clean out any old forms (for safety)
    card.querySelectorAll('form').forEach(f => f.remove());

    // Add/restore our review UI if needed
    let reviewDiv = card.querySelector('.astroweave-review');
    if (!reviewDiv) {
      reviewDiv = document.createElement('div');
      reviewDiv.className = 'astroweave-review';
      reviewDiv.innerHTML = `
        <textarea class="astroweave-review-text" placeholder="Write your review..." style="width: 100%; margin-bottom: 8px;"></textarea>
        <button class="astroweave-review-submit" style="padding: 6px 18px; cursor: pointer;">Submit Review</button>
      `;
      card.appendChild(reviewDiv);
    }

    // Hide if not logged in
    if (!clerkUser) {
      reviewDiv.style.display = 'none';
      let loginNotice = card.querySelector('.astroweave-login-notice');
      if (!loginNotice) {
        loginNotice = document.createElement('div');
        loginNotice.className = 'astroweave-login-notice';
        loginNotice.textContent = 'Please log in to leave a review.';
        card.appendChild(loginNotice);
      }
      return;
    }

    // Remove login notice if it exists
    let loginNotice = card.querySelector('.astroweave-login-notice');
    if (loginNotice) loginNotice.remove();

    // Wire up review submit button
    const submitBtn = reviewDiv.querySelector('.astroweave-review-submit');
    submitBtn.onclick = async () => {
      const textarea = reviewDiv.querySelector('.astroweave-review-text');
      if (!textarea.value.trim()) {
        alert('Enter a review first!');
        return;
      }
      const client = await getSupabaseClient();

      const { error } = await client.from('reviews').insert({
        user_id: clerkUser.id,
        order_id: card.getAttribute('data-astroweave-order') || 'ORD-001',
        text: textarea.value.trim(),
      });

      if (error) {
        console.error('Supabase insert error:', error.message);
        alert('Failed to submit review: ' + error.message);
      } else {
        alert('Thanks for your review!');
        textarea.value = '';
      }
    };
  });
});


