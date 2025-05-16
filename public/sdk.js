console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

// --- Supabase Setup ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Clerk to Supabase Auth Sync Helper ---
async function syncClerkToSupabase() {
  // Wait for Clerk to be loaded
  if (!window.Clerk) return;
  await window.Clerk.load();

  const session = window.Clerk.session;
  if (!session) return;

  // Use Clerk's JWT template name (yours is "supabase")
  const token = await session.getToken({ template: "supabase" });
  if (token) {
    supabase.auth.setAuth(token); // This sets the Authorization Bearer
  }
}

// --- Orders + Reviews Module (all code that needs auth must call syncClerkToSupabase before accessing Supabase user) ---
(function () {
  const ATTR = 'data-astroweave-orders';

  document.addEventListener('DOMContentLoaded', async () => {
    const wrapper = document.querySelector(`[${ATTR}]`);
    if (!wrapper) return;

    const endpoint = wrapper.getAttribute(ATTR);
    if (!endpoint) return console.error('AstroWeave: No orders endpoint found.');

    wrapper.closest('.page-wrapper')?.classList.add('orders-loading');

    try {
      const res = await fetch(endpoint);
      const orders = await res.json();
      if (!Array.isArray(orders)) throw new Error('Invalid data format');

      const template = wrapper.querySelector('[data-astroweave-order]');
      if (!template) return console.error('AstroWeave: No order template found.');
      template.remove();

      orders.forEach(order => {
        const clone = template.cloneNode(true);
        clone.setAttribute('data-astroweave-order', order.id); // Unique per order

        clone.querySelector('[data-astroweave-order-id]').textContent = order.id;
        clone.querySelector('[data-astroweave-order-date]').textContent = new Date(order.created_at).toLocaleDateString();
        clone.querySelector('[data-astroweave-order-status]').textContent = order.status;
        clone.querySelector('[data-astroweave-order-total]').textContent = `£${order.total.toFixed(2)}`;
        wrapper.appendChild(clone);
      });

      wrapper.closest('.page-wrapper')?.classList.remove('orders-loading');

      // --- Reviews Wiring ---
      wireUpReviewForms();
    } catch (err) {
      console.error('AstroWeave Orders Error:', err);
      wrapper.innerHTML = `<div>Failed to load orders. Please try again later.</div>`;
    }
  });

  // --- Review Module (now with real auth) ---
  async function wireUpReviewForms() {
    await syncClerkToSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    document.querySelectorAll('.order-card[data-astroweave-order]').forEach(card => {
      const orderId = card.getAttribute('data-astroweave-order');
      const reviewForm = card.querySelector('form');
      const textarea = reviewForm?.querySelector('textarea');
      const successMsg = card.querySelector('.w-form-done');
      const errorMsg = card.querySelector('.w-form-fail');

      // Hide default messages initially
      if (successMsg) successMsg.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';

      // Not logged in, replace form with message
      if (!user && reviewForm) {
        reviewForm.innerHTML = `<div>Please log in to leave a review.</div>`;
        return;
      }

      if (!reviewForm) {
        console.warn(`No form found in card ${orderId}`);
        return;
      }

      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!textarea.value.trim()) return;

        await syncClerkToSupabase(); // Always get fresh token before secure action

        // Insert review into Supabase
        const { error } = await supabase.from('reviews').insert({
          user_id: user.id,
          order_id: orderId,
          text: textarea.value.trim(),
        });

        if (error) {
          if (errorMsg) {
            errorMsg.style.display = '';
            successMsg.style.display = 'none';
          } else {
            alert('Failed to submit review.');
          }
          console.error('Supabase insert error:', error.message);
          return;
        }

        if (successMsg) {
          successMsg.style.display = '';
          errorMsg.style.display = 'none';
        } else {
          alert('Thanks for your review!');
        }
        reviewForm.reset();
      });
    });
  }
})();
