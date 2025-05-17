console.log('AstroWeave SDK ✅ Connected with Supabase + Clerk');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // keep secret if deployed server-side

async function getSupabaseClient() {
  await window.Clerk.load();
  const session = window.Clerk.session;
  if (!session) {
    console.warn('❌ No active Clerk session found.');
    return null;
  }

  const token = await session.getToken({ template: 'supabase' });

  console.log('📛 Clerk JWT token:', token);
if (!token) {
  console.warn('❌ Clerk token is null — user may not be logged in or template is misconfigured.');
}


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

  console.log('🧑 Clerk user:', clerkUser);

  if (!clerkUser) {
    console.warn('❌ No Clerk user found.');
    return;
  }

  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*'); // RLS will handle filtering by user_id

  if (error) {
    console.error('❌ Failed to fetch orders:', error);
  } else {
    console.log('📦 Orders loaded:', orders);
  }

  if (!orders || orders.length === 0) {
    console.warn('⚠️ No orders returned. RLS may be blocking or no data exists.');
  }

  const container = document.getElementById('orderList');
  if (!container) {
    console.warn('⚠️ Missing #orderList container in DOM');
    return;
  }

  container.innerHTML = ''; // Clear placeholder content

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

    // Review UI
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'astroweave-review';
    reviewDiv.innerHTML = `
      <textarea class="astroweave-review-text" placeholder="Write your review..." style="width: 100%; margin-bottom: 8px;"></textarea>
      <button class="astroweave-review-submit" style="padding: 6px 18px; cursor: pointer;">Submit Review</button>
    `;
    card.appendChild(reviewDiv);

    // Review submit
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
