# 🚀 **REDRIVE - MVP Completed & More Features in Development!** 🚀

> _New Branch: A Solo Developer’s Triumph Over 50+ Days, 220+ Hours, Countless Debugging Sessions, and Unstoppable Determination—with immense support from my life partner, Hiral! ❤️_

---

## 🏆 **About the Project**

🔴 **REDRIVE** is more than just a project—it’s the result of **sleepless nights, relentless debugging, and an unshakable passion for coding**.  
🛠 **Designed, built, and perfected by a single developer**, this **MVP (Minimum Viable Product)** marks a milestone of **40+ days and 220+ hours** of effort, research, and trial-and-error learning.  
📖 **From ideation to execution**, this project pushed me beyond my limits, making me **a better problem solver, a stronger coder, and a more resilient developer**.

💡 **Special Thanks to Hiral**  
My partner, my motivator, and my biggest supporter—**Hiral** has been by my side throughout this journey, helping me stay focused, pushing me to overcome challenges, and celebrating every milestone with me. This wouldn’t have been possible without her. ❤️

---

## 🎯 **The Journey of REDRIVE MVP**

✔ **40+ Days of Non-Stop Development** 🏗  
✔ **220+ Hours of Coding, Debugging & Brainstorming** 💡  
✔ **Mastered Next.js, Prisma, MongoDB, and Advanced API Development** 🔥  
✔ **Transformed Ideas Into a Functional, Scalable Web App** 🚀  
✔ **Iterating & Adding More Features for a Full-Fledged Product!** 📈

---

## ✨ **Tech Stack & Tools**

🚀 **Built Using the Best Tools in the Industry**

### **Frontend**

- 🛠 **Next.js 14** (React, TypeScript) - For fast, scalable UI
- 🎨 **Tailwind CSS** - For sleek, responsive design

### **Backend**

- ⚙ **Next.js API Routes** - For efficient, serverless backend
- 🗄 **MongoDB + Prisma ORM** - For robust database management

### **Authentication & Security**

- 🔐 **NextAuth.js** - Secure authentication (Google, GitHub, Email)
- 🔑 **JWT Tokens** - To keep users logged in securely

### **Infrastructure & Deployment**

- 🚀 **Vercel** - For seamless, high-performance hosting
- 📡 **API Integration** - RESTful API endpoints for dynamic functionality

---

## 🔥 **What Makes REDRIVE Special?**

✅ **A True Solo Developer’s Masterpiece** - Every line of code, every feature, every debug was done by **ME**!  
✅ **MVP Ready in Just Over a Month!** - A complete, functional web app in record time!  
✅ **Real-World Features & Best Practices** - Authentication, reviews, reservations, listings, UI components, error handling, and more!  
✅ **Hundreds of Debugging Sessions Overcome** - Pushed my coding limits beyond anything I’ve done before!  
✅ **Scalable, Modular, and Future-Proof** - Built to **grow into a full-fledged product** with real users.

---

## 🚀 **Core Features**

### ✅ **Authentication**

- Google, GitHub, and Email Sign-in with **NextAuth.js**
- Secure **JWT-based authentication**
- Persistent user sessions

### ✅ **Listing Management**

- Users can **add, edit, and delete listings**
- Upload images using **Cloudinary**
- Dynamic **category selection**

### ✅ **Reservations & Booking System**

- Users can **book rentals** and manage their reservations
- Dynamic **price calculations**
- Only the **owner or the booker** can **cancel**

### ✅ **Reviews & Ratings**

- Users can **leave reviews only after their booking ends**
- Reviews have **star ratings + text + thumbs up/down**
- **Mobile-first UI for reviews** with swipe navigation

### ✅ **Responsive & Mobile-Friendly**

- **Desktop:** Scrollable **horizontal review cards**
- **Mobile:** Swipe-based **single review view**
- **Tailwind CSS** for pixel-perfect responsiveness

---

## 💡 **Challenges & Learnings**

🛠 **Debugging Prisma & MongoDB Issues**  
🔄 **Implementing Multi-Step Modals & Forms**  
📡 **Building a Full Authentication System**  
⚙ **Handling API Requests Efficiently**  
💾 **Ensuring Database Integrity & Relations**  
🚀 **Deploying on Vercel with Environment Variables**

This project taught me **real-world problem-solving skills** that no tutorial ever could.

---

## 🎯 **Next Steps & Future Features**

Even though **the MVP is complete**, the journey isn’t over! 🚀

🔜 **User Profiles & Dashboard**  
🔜 **Payment Integration (Stripe/PayPal)**  
🔜 **Real-Time Notifications**  
🔜 **Messaging System Between Users**  
🔜 **AI-Powered Smart Recommendations**

This is just the beginning. The **best is yet to come**! 💪

---

## 💙 **A Solo Developer’s Reflection**

This was the **most challenging** yet **most rewarding** experience of my coding career.  
From **bugs that made me rethink life** 😆 to **finally solving issues after hours of debugging**—  
**This journey made me realize that no problem is unsolvable, no bug unbeatable.**

To every **developer grinding through their own journey**,  
**KEEP GOING. The breakthroughs are worth it.**

🚀 **REDRIVE is proof that with enough perseverance, you can build anything.** 🚀

---

### 🏁 **Final Words**

If you’ve read this far, **thank you!**  
If you’re a fellow dev, **I hope this inspires you to keep coding.**  
If you’re an investor... well, **call me! 😆**

**_Built with passion. Debugged with frustration. Launched with pride._**

💻 **A Solo Developer’s Masterpiece - REDRIVE - 40+ Days, 220+ Hours, Infinite Lessons Learned!** 🎯

---

🚀 **Let’s connect!** Find me on:  
**GitHub | LinkedIn | Twitter** (or wherever devs hang out! 😆)

---

🔥 **Now go build your own masterpiece.** **YOU GOT THIS!** 💪💡🚀

## 📂 Project Tree

- 📄 .gitignore
- 📄 README.md
- 📂 **app**
  - 📂 **actions**
    - 📄 getCurrentUser.ts
    - 📄 getFavoriteListings.ts
    - 📄 getListingById.ts
    - 📄 getListings.ts
    - 📄 getReservations.ts
    - 📄 getUserById.ts
  - 📂 **api**
    - 📂 **auth**
      - 📂 **user**
        - 📄 route.ts
    - 📂 **favorites**
      - 📂 **[listingId]**
        - 📄 route.ts
    - 📂 **listings**
      - 📂 **[listingId]**
        - 📄 route.ts
      - 📄 route.ts
    - 📂 **places**
      - 📄 route.ts
    - 📂 **profile**
      - 📂 **[userId]**
        - 📄 route.ts
      - 📄 route.ts
    - 📂 **register**
      - 📄 route.ts
    - 📂 **reservations**
      - 📂 **[reservationId]**
        - 📄 route.ts
      - 📄 route.ts
    - 📂 **reviews**
      - 📂 **[listingId]**
        - 📄 route.ts
      - 📄 route.ts
  - 📂 **components**
    - 📄 Avatar.tsx
    - 📄 Button.tsx
    - 📄 CategoryBox.tsx
    - 📄 ClientOnly.tsx
    - 📄 Container.tsx
    - 📄 EmptyState.tsx
    - 📄 Heading.tsx
    - 📄 HeartButton.tsx
    - 📄 ListingCardButton.tsx
    - 📄 Loader.tsx
    - 📄 Map.tsx
    - 📂 **icons**
      - 📄 motorhome.svg
    - 📂 **inputs**
      - 📄 AmenitiesSelector.tsx
      - 📄 Calender.tsx
      - 📄 CategoryInput.tsx
      - 📄 Counter.tsx
      - 📄 CountrySelect.tsx
      - 📄 DateSelector.tsx
      - 📄 FuelSelector.tsx
      - 📄 ImageUpload.tsx
      - 📄 Input.tsx
      - 📄 StateSelector.tsx
      - 📄 SuburbSelector.tsx
      - 📄 TextArea.tsx
      - 📄 YearSelect.tsx
    - 📂 **listings**
      - 📄 ListingCard.tsx
      - 📄 ListingCategory.tsx
      - 📄 ListingHead.tsx
      - 📄 ListingInfo.tsx
      - 📄 ListingMap.tsx
      - 📄 ListingReservation.tsx
    - 📂 **modals**
      - 📄 LoginModal.tsx
      - 📄 Modal.tsx
      - 📄 RegisterModal.tsx
      - 📄 RentModal.tsx
      - 📄 SearchModal.tsx
    - 📂 **navbar**
      - 📄 Categories.tsx
      - 📄 Logo.tsx
      - 📄 MenuItem.tsx
      - 📄 Navbar.tsx
      - 📄 Search.tsx
      - 📄 UserMenu.tsx
    - 📂 **reviews**
      - 📄 Reviews.tsx
  - 📂 **edit-utility**
    - 📂 **[listingId]**
      - 📄 page.tsx
  - 📄 error.tsx
  - 📄 favicon.ico
  - 📄 favicon.png
  - 📂 **favorites**
    - 📄 FavoritesClient.tsx
    - 📄 page.tsx
  - 📄 globals.css
  - 📂 **hooks**
    - 📄 useAmenities.ts
    - 📄 useCountries.ts
    - 📄 useFavorites.ts
    - 📄 useLoginModal.ts
    - 📄 useRegisterModal.ts
    - 📄 useRentModal.ts
    - 📄 useSearchModal.ts
  - 📄 layout.tsx
  - 📂 **libs**
    - 📄 GoogleMapLoader.ts
    - 📄 prismadb.ts
  - 📂 **listings**
    - 📂 **[listingId]**
      - 📄 ListingClient.tsx
      - 📄 page.tsx
  - 📄 loading.tsx
  - 📄 page.tsx
  - 📂 **profile**
    - 📄 page.tsx
  - 📂 **properties**
    - 📄 MyUtilitiesClient.tsx
    - 📄 PropertiesClient.tsx
    - 📄 page.tsx
  - 📂 **providers**
    - 📄 ToasterProvider.tsx
  - 📂 **reservations**
    - 📄 ReservationsClient.tsx
    - 📄 page.tsx
  - 📂 **review**
    - 📂 **[reservationId]**
      - 📄 page.tsx
  - 📂 **trips**
    - 📄 TripsClient.tsx
    - 📄 page.tsx
  - 📂 **types**
    - 📄 index.ts
- 📄 eslint.config.mjs
- 📄 ignore.txt
- 📄 middleware.ts
- 📄 next.config.js
- 📄 package-lock.json
- 📄 package.json
- 📂 **pages**
  - 📂 **api**
    - 📂 **auth**
      - 📄 [...nextauth].ts
- 📄 postcss.config.js
- 📄 postcss.config.mjs
- 📂 **prisma**
  - 📄 schema.prisma
- 📄 propmt.txt
- 📂 **public**
  - 📄 file.svg
  - 📄 globe.svg
  - 📂 **images**
    - 📄 logo.png
    - 📄 placeholder.png
  - 📄 marker.svg
  - 📄 next.svg
  - 📄 test.Suburb.json
  - 📄 vercel.svg
  - 📄 window.svg
- 📄 suburbs.csv
- 📄 tailwind.config.js
- 📄 tailwind.config.ts
- 📄 test.Listing.json
- 📄 test.Reservation.json
- 📄 test.Review.json
- 📄 tsconfig.json
