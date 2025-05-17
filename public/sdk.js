console.log('AstroWeave SDK ✅ Connected with Supabase Auth');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // keep safe

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Show/hide logged-in indicator
  const statusEl = document.getElementById('logged-in-status');
  if (statusEl) statusEl.style.display = user ? 'block' : 'none';

  // Bind logout button
  const logoutBtn = document.getElementById('log-out-bttn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      location.reload();
    });
  }

  // Bind Google login button
  const googleBtn = document.getElementById('google-bttn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    });
  }

  // Stop here if not logged in
  if (!user || userError) {
    console.warn('❌ No Supabase user session found.');
    return;
  }

  // Fetch orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*');

  if (error || !orders) {
    console.error('❌ Failed to fetch orders:', error);
    return;
  }

  if (!orders.length) {
    console.warn('⚠️ No orders returned. Supabase result is empty.');
  }

  const container = document.getElementById('orderList');
  if (!container) {
    console.warn('⚠️ Missing #orderList container in DOM');
    return;
  }

  container.innerHTML = ''; // Clear dummy cards

  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.setAttribute('data-astroweave-order', order.id);

    card.innerHTML = `
      <div class="order-id">Order #: ${order.order_number}</div>
      <div class="order-date">Date: ${new Date(order.order_date).toLocaleDateString()}</div>
      <div class="order-status">Status: ${order.status}</div>
      <div class="order-total">Total: £${order.total_price.toFixed(2)}</div>
    `;

    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'astroweave-review';
    reviewDiv.innerHTML = `
      <textarea class="astroweave-review-text" placeholder="Write your review..." style="width: 100%; margin-bottom: 8px;"></textarea>
      <button class="astroweave-review-submit" style="padding: 6px 18px; cursor: pointer;">Submit Review</button>
    `;
    card.appendChild(reviewDiv);

    const submitBtn = reviewDiv.querySelector('.astroweave-review-submit');
    submitBtn.onclick = async () => {
      const textarea = reviewDiv.querySelector('.astroweave-review-text');
      const text = textarea.value.trim();

      if (!text) {
        alert('Enter a review first!');
        return;
      }

      const { error: insertError } = await supabase.from('reviews').insert({
        user_id: user.id,
        order_id: order.id,
        text
      });

      if (insertError) {
        console.error('❌ Review insert error:', insertError.message);
        alert('Failed to submit review: ' + insertError.message);
      } else {
        alert('✅ Thanks for your review!');
        textarea.value = '';
      }
    };

    container.appendChild(card);
  });
});
