console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

// Use Supabase JS v2 for setAuth support
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

// Instantiate a single Supabase client (v2)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Returns the Supabase client, setting the Clerk JWT as the auth token if available.
 */
async function getSupabaseClient() {
  if (!window.Clerk) return supabase;
  await window.Clerk.load();

  const session = window.Clerk.session;
  if (!session) return supabase;

  const token = await session.getToken({ template: 'supabase' });
  console.log('Clerk Supabase JWT:', token);

  // Use setAuth (v2) to set the access token for all Supabase requests
  supabase.auth.setAuth(token);
  return supabase;
}

/**
 * Fetch the authenticated user from Supabase
 */
async function getUser() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    console.error('Supabase getUser error:', error);
    return null;
  }
  console.log('Supabase authenticated user:', data.user);
  return data.user;
}

/**
 * Wire up the orders UI and review forms
 */
(async () => {
  const client = await getSupabaseClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) {
    console.error('Error fetching user:', userError);
  }

  // Orders rendering logic (dummy or real)
  const ordersWrapper = document.querySelector('[data-astroweave-orders]');
  if (ordersWrapper) {
    ordersWrapper.closest('.page-wrapper')?.classList.add('orders-loading');
    try {
      const ordersEndpoint = ordersWrapper.getAttribute('data-astroweave-orders');
      const res = await fetch(ordersEndpoint);
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
  document.querySelectorAll('.order-card[data-astroweave-order]').forEach(card => {
    const reviewForm = card.querySelector('form');
    const textarea = reviewForm?.querySelector('textarea');
    const successMsg = card.querySelector('.w-form-done');
    const errorMsg = card.querySelector('.w-form-fail');

    if (!user) {
      reviewForm && (reviewForm.innerHTML = '<div>Please log in to leave a review.</div>');
      return;
    }

    reviewForm?.addEventListener('submit', async e => {
      e.preventDefault();
      if (!textarea?.value.trim()) return;

      const { error: insertError } = await client.from('reviews').insert({
        user_id: user.id,
        order_id: card.getAttribute('data-astroweave-order'),
        text: textarea.value.trim(),
      });

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        errorMsg ? errorMsg.style.display = '' : alert('Failed to submit review');
        successMsg && (successMsg.style.display = 'none');
      } else {
        successMsg ? successMsg.style.display = '' : alert('Thanks for your review!');
        errorMsg && (errorMsg.style.display = 'none');
        reviewForm.reset();
      }
    });
  });
})();
