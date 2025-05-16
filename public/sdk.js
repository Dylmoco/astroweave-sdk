console.log('AstroWeave SDK loaded ✅ (REAL CLERK+SUPABASE AUTH)');

// Use Supabase JS v2 for Clerk JWT support
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lpuqrzvokroazwlricgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFyenZva3JvYXp3bHJpZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDE0NzYsImV4cCI6MjA2MjgxNzQ3Nn0.hv_idyZGUD0JlFBwl_zWLpCFnI1Uoit-IahjXa6wM84';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSupabaseClient() {
  if (!window.Clerk) return supabase;
  await window.Clerk.load();
  const session = window.Clerk.session;
  if (!session) return supabase;

  const token = await session.getToken({ template: 'supabase' });
  console.log('Clerk Supabase JWT:', token);

  // This is what actually sets the JWT for all requests in v2!
  supabase.auth.setAuth(token);

  return supabase;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Your order/review UI logic stays the same as before

  // ...Render orders code...

  // Wire review form submit (replace this with your new submit logic, as before)
  const clerkUser = window.Clerk?.session?.user;
  const orderCards = document.querySelectorAll('.order-card[data-astroweave-order]');
  orderCards.forEach(card => {
    let reviewForm = card.querySelector('form');
    const hasTextarea = reviewForm?.querySelector('textarea');
    if (!reviewForm || !hasTextarea) {
      reviewForm = document.createElement('form');
      reviewForm.innerHTML = `
        <textarea placeholder="Write your review" required></textarea>
        <button type="submit">Submit Review</button>
      `;
      card.appendChild(reviewForm);
    }

    if (!clerkUser) {
      reviewForm.style.display = 'none';
      const loginNotice = document.createElement('div');
      loginNotice.textContent = 'Please log in to leave a review.';
      card.appendChild(loginNotice);
      return;
    }

    const handleSubmit = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const textarea = reviewForm.querySelector('textarea');
      if (!textarea || !textarea.value.trim()) return;

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
        console.log('Review submitted successfully');
        alert('Thanks for your review!');
        reviewForm.reset();
      }
    };

    reviewForm.addEventListener('submit', handleSubmit, true);
    const submitBtn = reviewForm.querySelector('button[type=\"submit\"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit, true);
    }
  });
});


