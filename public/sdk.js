console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

// Use Supabase JS v1 for global headers support and getUser
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

let supabaseClient = null;

/**
 * Returns a Supabase client with Clerk JWT in headers if user is signed in
 */
async function getSupabaseClient() {
  // If Clerk isn't loaded yet, return anon client
  if (!window.Clerk) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  await window.Clerk.load();

  const session = window.Clerk.session;
  if (!session) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  const token = await session.getToken({ template: 'supabase' });
  console.log('Clerk Supabase JWT:', token);

  // Recreate client with global auth header
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  });
  return supabaseClient;
}

(async () => {
  // Initialize Supabase client for orders
  const supabase = await getSupabaseClient();

  // Orders rendering logic
  const ordersWrapper = document.querySelector('[data-astroweave-orders]');
  if (ordersWrapper) {
    ordersWrapper.closest('.page-wrapper')?.classList.add('orders-loading');
    try {
      const endpoint = ordersWrapper.getAttribute('data-astroweave-orders');
      const res = await fetch(endpoint);
      const orders = await res.json();
      if (Array.isArray(orders)) {
        const template = ordersWrapper.querySelector('[data-astroweave-order]');
        template?.remove();
        orders.forEach(order => {
          const clone = template.cloneNode(true);
          clone.setAttribute('data-astroweave-order', order.id);
          clone.querySelector('[data-astroweave-order-id]').textContent = order.id;
          clone.querySelector('[data-astroweave-order-date]').textContent = new Date(order.created_at).toLocaleDateString();
          clone.querySelector('[data-astroweave-order-status]').textContent = order.status;
          clone.querySelector('[data-astroweave-order-total]').textContent = `£${order.total.toFixed(2)}`;
          ordersWrapper.appendChild(clone);
        });
      }
    } catch (err) {
      console.error('AstroWeave Orders Error:', err);
      ordersWrapper.innerHTML = `<div>Failed to load orders. Please try again later.</div>`;
    } finally {
      ordersWrapper.closest('.page-wrapper')?.classList.remove('orders-loading');
    }
  }

  // Review forms wiring with debug and fallback injection
  const clerkUser = window.Clerk?.session?.user;
  const orderCards = document.querySelectorAll('.order-card[data-astroweave-order]');
  console.log('Found order cards for review wiring:', orderCards.length);

  orderCards.forEach(card => {
    let reviewForm = card.querySelector('form');
    if (!reviewForm) {
      console.warn('No review form found in card, injecting default form for testing:', card);
      // Inject a simple review form for testing
      reviewForm = document.createElement('form');
      reviewForm.innerHTML = `
        <textarea placeholder="Write your review" required></textarea>
        <button type="submit">Submit Review</button>
      `;
      card.appendChild(reviewForm);
    }

    // Hide form if not logged in
    if (!clerkUser) {
      reviewForm.style.display = 'none';
      const loginNotice = document.createElement('div');
      loginNotice.textContent = 'Please log in to leave a review.';
      card.appendChild(loginNotice);
      return;
    }

    console.log('Wiring review form for user:', clerkUser.id);
    reviewForm.addEventListener('submit', async e => {
      e.preventDefault();
      const textarea = reviewForm.querySelector('textarea');
      if (!textarea.value.trim()) return;

      const client = await getSupabaseClient();
      console.log('Submitting review for order:', card.getAttribute('data-astroweave-order'));

      const { error: insertError } = await client.from('reviews').insert({
        user_id: clerkUser.id,
        order_id: card.getAttribute('data-astroweave-order'),
        text: textarea.value.trim(),
      });

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        alert('Failed to submit review: ' + insertError.message);
      } else {
        alert('Thanks for your review!');
        reviewForm.reset();
      }
    });
  });
})();

