console.log('AstroWeave SDK ✅ Connected with Supabase + Clerk');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key_here'; // replace with real one

async function getSupabaseClient() {
  await window.Clerk.load();
  const session = window.Clerk.session;
  const token = await session.getToken({ template: 'supabase' });

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.Clerk.load();
  const clerkUser = window.Clerk?.session?.user;
  if (!clerkUser) return;

  const supabase = await getSupabaseClient();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*');

  if (error || !orders) return;

  const container = document.getElementById('orderList');
  if (!container) return;

  container.innerHTML = '';

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
        user_id: clerkUser.id,
        order_id: order.id,
        text
      });

      if (insertError) {
        alert('Failed to submit review');
      } else {
        alert('✅ Thanks for your review!');
        textarea.value = '';
      }
    };

    container.appendChild(card);
  });
});
