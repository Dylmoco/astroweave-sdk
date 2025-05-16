console.log('AstroWeave SDK loaded ✅');

// --- Supabase Setup ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Orders Module ---
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
        clone.setAttribute('data-astroweave-order', order.id); // critical for reviews

        clone.querySelector('[data-astroweave-order-id]').textContent = order.id;
        clone.querySelector('[data-astroweave-order-date]').textContent = new Date(order.created_at).toLocaleDateString();
        clone.querySelector('[data-astroweave-order-status]').textContent = order.status;
        clone.querySelector('[data-astroweave-order-total]').textContent = `£${order.total.toFixed(2)}`;
        wrapper.appendChild(clone);
      });

      wrapper.closest('.page-wrapper')?.classList.remove('orders-loading');

      // --- Reviews Wiring (MVP: 1 review per order) ---
      wireUpReviewForms();
    } catch (err) {
      console.error('AstroWeave Orders Error:', err);
      wrapper.innerHTML = `<div>Failed to load orders. Please try again later.</div>`;
    }
  });

  // --- Review Module: MVP ---
  async function wireUpReviewForms() {
    // Auth: get user
    const { data: { user } } = await supabase.auth.getUser();

    // For each duplicated order-card
    document.querySelectorAll('.order-card[data-astroweave-order]').forEach(card => {
      const orderId = card.getAttribute('data-astroweave-order');
      const reviewForm = card.querySelector('form');
      const textarea = reviewForm?.querySelector('textarea');
      const submitBtn = reviewForm?.querySelector('input[type="submit"],button[type="submit"]');
      const successMsg = card.querySelector('.Success\\ Message') || card.querySelector('.success-message');
      const errorMsg = card.querySelector('.Error\\ Message') || card.querySelector('.error-message');

      // Clean up old messages
      if (successMsg) successMsg.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';

      // If not logged in, disable form
      if (!user) {
        if (reviewForm) {
          reviewForm.innerHTML = `<div>Please log in to leave a review.</div>`;
        }
        return;
      }

      // Wire up submit handler
      reviewForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!textarea.value.trim()) return;

        // Insert review into Supabase
        const { error } = await supabase.from('reviews').insert({
          user_id: user.id,
          order_id: orderId,
          text: textarea.value.trim(),
          // Add "rating" if you want stars
        });

        if (error) {
          if (errorMsg) {
            errorMsg.textContent = 'Failed to submit review. Please try again.';
            errorMsg.style.display = '';
          } else {
            alert('Failed to submit review.');
          }
          return;
        }

        if (successMsg) {
          successMsg.textContent = 'Thanks for your review!';
          successMsg.style.display = '';
        } else {
          alert('Thanks for your review!');
        }
        reviewForm.reset();

        // (Optional) Disable form or hide after submit:
        // reviewForm.style.display = 'none';
      });
    });
  }
})();
