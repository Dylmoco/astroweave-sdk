console.log('AstroWeave SDK loaded ✅ (DEBUG VERSION)');

// --- Supabase Setup ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Orders Module ---
(function () {
  const ATTR = 'data-astroweave-orders';

  document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired!');
    const wrapper = document.querySelector(`[${ATTR}]`);
    if (!wrapper) return console.log('NO wrapper found');

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

  // --- Review Module: MVP (Webflow form compatible, debug) ---
  async function wireUpReviewForms() {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('wireUpReviewForms(): running!');
    const cards = document.querySelectorAll('.order-card[data-astroweave-order]');
    console.log('Found order cards:', cards.length);

    cards.forEach(card => {
      const orderId = card.getAttribute('data-astroweave-order');
      const reviewForm = card.querySelector('form');
      const textarea = reviewForm?.querySelector('textarea');

      // Webflow success/error blocks
      const successMsg = card.querySelector('.w-form-done');
      const errorMsg = card.querySelector('.w-form-fail');

      // Hide default messages initially
      if (successMsg) successMsg.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';

      if (!user && reviewForm) {
        reviewForm.innerHTML = `<div>Please log in to leave a review.</div>`;
        console.log(`Card ${orderId}: Not logged in`);
        return;
      }

      if (!reviewForm) {
        console.warn(`No form found in card ${orderId}`);
        return;
      }

      console.log(`Wiring up form for orderId ${orderId}`);

      reviewForm.addEventListener('submit', async (e) => {
        console.log(`Submit fired for order ${orderId}`);
        e.preventDefault();
        e.stopPropagation();

        if (!textarea.value.trim()) {
          console.log(`Submit cancelled for order ${orderId} (empty textarea)`);
          return;
        }

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

