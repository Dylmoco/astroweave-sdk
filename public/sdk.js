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
  // If Clerk isn't loaded, return anon client
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

  // Create a new client instance with global headers for auth
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  return supabaseClient;
}

(async () => {
  // Initialize client
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

  // Review forms wiring
  // Get Clerk user directly
  const clerkUser = window.Clerk && window.Clerk.session ? window.Clerk.session.user : null;

  document.querySelectorAll('.order-card[data-astroweave-order]').forEach(card => {
    const reviewForm = card.querySelector('form');
    const textarea = reviewForm?.querySelector('textarea');
    const successMsg = card.querySelector('.w-form-done');
    const errorMsg = card.querySelector('.w-form-fail');

    if (!clerkUser) {
      reviewForm && (reviewForm.innerHTML = '<div>Please log in to leave a review.</div>');
      return;
    }

    reviewForm?.addEventListener('submit', async e => {
      e.preventDefault();
      if (!textarea?.value.trim()) return;

      const client = await getSupabaseClient();
      const { error: insertError } = await client.from('reviews').insert({
        user_id: clerkUser.id,
        order_id: card.getAttribute('data-astroweave-order'),
        text: textarea.value.trim(),
      });

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        if (errorMsg) errorMsg.style.display = '';
        if (successMsg) successMsg.style.display = 'none';
      } else {
        if (successMsg) successMsg.style.display = '';
        if (errorMsg) errorMsg.style.display = 'none';
        reviewForm.reset();
      }
    });
  });
})();

