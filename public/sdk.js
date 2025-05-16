console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

// Use Supabase JS v2 for Clerk JWT support
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSupabaseClient() {
  if (!window.Clerk) return supabase;
  await window.Clerk.load();
  const session = window.Clerk.session;
  if (!session) return supabase;

  const token = await session.getToken({ template: 'supabase' });
  console.log('Clerk Supabase JWT:', token);

  // Set Clerk JWT for all requests (v2!)
  supabase.auth.setAuth(token);

  return supabase;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Clerk session/user
  const clerkUser = window.Clerk?.session?.user;

  // For every order card, inject a fresh review UI
  const orderCards = document.querySelectorAll('.order-card[data-astroweave-order]');
  orderCards.forEach(card => {
    // Remove all existing forms under this card (avoid Webflow interference)
    card.querySelectorAll('form').forEach(f => f.remove());

    // Add our review UI
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
      const loginNotice = document.createElement('div');
      loginNotice.textContent = 'Please log in to leave a review.';
      card.appendChild(loginNotice);
      return;
    }

    // Wire up review submit
    reviewDiv.querySelector('.astroweave-review-submit').onclick = async () => {
      const textarea = reviewDiv.querySelector('.astroweave-review-text');
      if (!textarea.value.trim()) return alert('Enter a review first!');
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


