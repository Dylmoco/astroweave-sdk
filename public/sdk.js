console.log('AstroWeave SDK ✅ Connected with Supabase + Clerk');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpY2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

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
    .select('*')
    .ilike('user_id', `%${clerkUser.id}%`);

  if (error) {
    console.error('❌ Failed to fetch orders:', error);
  } else {
    console.log('📦 Orders loaded:', orders);
  }

  if (!orders || orders.length === 0) {
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

    // Append review UI
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'astroweave-review';
    reviewDiv.innerHTML = `
      <textarea class="astroweave-review-text" placeholder="Write your review..." style="width: 100%; margin-bottom: 8px;"></textarea>
      <button class="astroweave-review-submit" style="padding: 6px 18px; cursor: pointer;">Submit Review</button>
    `;
    card.appendChild(reviewDiv);

    // Submit handler
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
