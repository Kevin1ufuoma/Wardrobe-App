document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // 0. INITIALIZE NETWORK & DATABASE ENVIRONMENTS
  // ==========================================
  const SUPABASE_URL = "https://ibdhreylfyzdvzkiexfs.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZGhyZXlsZnl6ZHZ6a2lleGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODU0OTQsImV4cCI6MjEwMzc2MTQ5NH0.53fjsCbn8z-2egy4wGcpqnLloWwKFOw2ZIDZrYMrR40";
  let supabaseClient = null;
  let useCloudDB = false;

  try {
    if (typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      useCloudDB = true;
      console.log("Connected to Supabase.");
    }
  } catch (err) { console.warn("Using local fallback system storage."); }

  // ==========================================
  // 1. SELECTOR HOOKS & BASE VARIABLES
  // ==========================================
  const maleBtn = document.getElementById("gender-male");
  const femaleBtn = document.getElementById("gender-female");
  const malePanel = document.getElementById("male-wardrobe");
  const femalePanel = document.getElementById("female-wardrobe");
  
  const maleSelects = document.querySelectorAll("#male-wardrobe select");
  const maleColorSection = document.getElementById("male-color-section");
  const femaleSelects = document.querySelectorAll("#female-wardrobe select");
  const femaleColorSection = document.getElementById("female-color-section");

  const dayButtons = document.querySelectorAll(".day-select-btn");
  const activeDayHeading = document.getElementById("active-day-heading");
  let activePlannedDay = ""; 

  const authGateway = document.getElementById("auth-gateway");
  const mainAppWrapper = document.querySelector(".app-layout-wrapper");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const toggleLoginViewBtn = document.getElementById("toggle-login-view");
  const toggleRegisterViewBtn = document.getElementById("toggle-register-view");
  const avatarUploadInput = document.getElementById("user-avatar-upload");
  const avatarPreviewBadge = document.getElementById("avatar-preview-badge");

  const userProfileCard = document.getElementById("user-profile-badge-card");
  const userAvatarDisplay = document.getElementById("user-avatar-display");
  const userDisplayName = document.getElementById("user-display-name");
  const appSignoutActionBtn = document.getElementById("app-signout-action-btn");

  const sidebarPanel = document.querySelector(".planning-aside-sidebar");
  const sidebarHeader = document.querySelector(".sidebar-header");

  let transientAvatarDataUrl = ""; 
  let weeklyOutfitsArchive = { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null };

  // ==========================================
  // 2. THE DYNAMIC ACCOUNT WARDROBE CATALOGUE SYSTEM
  // ==========================================
  let wardrobeCatalogue = {};
  const wearUpload = document.getElementById("wear-upload");
  const uploadGender = document.getElementById("upload-item-gender");
  const uploadType = document.getElementById("upload-item-type");
  const uploadColor = document.getElementById("upload-item-color");

  if (wearUpload) {
    // 🟢 CRITICAL TRACKING: Enforce strict single-listener bindings
    wearUpload.onchange = (e) => {
      const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user");
      if (!activeSessionEmail) { alert("Please log in first."); return; }

      const file = e.target.files[0]; 
      if (file) {
        // Validation check to block illegal cross-gender uploads
        const targetGender = uploadGender.value;
        const targetType = uploadType.value;
        if (targetGender === "male" && ["blouse","skirt","high-heels","dress"].includes(targetType)) {
          alert("Error: Women's exclusive apparel parameters cannot be catalogued under male closets!");
          wearUpload.value = ""; return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
          const uniqueCatalogKey = `${targetGender}_${targetType}_${uploadColor.value}`;
          const dynamicUserCatalogueKey = `wardrobe_catalogue_db_${activeSessionEmail}`;
          
          wardrobeCatalogue = JSON.parse(localStorage.getItem(dynamicUserCatalogueKey)) || {};
          wardrobeCatalogue[uniqueCatalogKey] = evt.target.result;
          localStorage.setItem(dynamicUserCatalogueKey, JSON.stringify(wardrobeCatalogue));
          
          alert(`Catalogue Updated Successfully!`);
          wearUpload.value = ""; 
          renderDynamicOutfitPreview();
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // ==========================================
  // 3. DATABASE AUTHENTICATION HYBRID LAYER
  // ==========================================
  async function dbFetchUserData(email) {
    if (!email) return null;
    if (useCloudDB && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('wardrobe_users_db').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();
        if (!error && data) return data;
      } catch (err) { console.warn("Using local snapshot lookup."); }
    }
    const registeredUsersMap = JSON.parse(localStorage.getItem("wardrobe_users_db")) || {};
    return registeredUsersMap[email.toLowerCase().trim()] || null;
  }

  async function dbSaveNewUser(email, userDataProfile) {
    const cleanEmail = email.toLowerCase().trim();
    if (useCloudDB && supabaseClient) {
      try {
        const { error } = await supabaseClient.from('wardrobe_users_db').insert([{ email: cleanEmail, first_name: userDataProfile.firstName, password: userDataProfile.password, avatar_data_url: userDataProfile.avatar || "" }]);
        if (!error) return { success: true };
      } catch (err) { console.warn("Using local cache fallback."); }
    }
    const registeredUsersMap = JSON.parse(localStorage.getItem("wardrobe_users_db")) || {};
    registeredUsersMap[cleanEmail] = userDataProfile;
    localStorage.setItem("wardrobe_users_db", JSON.stringify(registeredUsersMap));
    return { success: true };
  }

  // ==========================================
  // 4. AUTHENTICATION SYSTEMS (POP-UP PROTECTION)
  // ==========================================
  if (toggleLoginViewBtn && toggleRegisterViewBtn && loginForm && registerForm) {
    toggleLoginViewBtn.onclick = () => {
      toggleLoginViewBtn.classList.add("active"); toggleRegisterViewBtn.classList.remove("active");
      loginForm.style.display = "flex"; registerForm.style.display = "none";
    };
    toggleRegisterViewBtn.onclick = () => {
      toggleRegisterViewBtn.classList.add("active"); toggleLoginViewBtn.classList.remove("active");
      registerForm.style.display = "flex"; loginForm.style.display = "none";
    };
  }

  if (avatarUploadInput && avatarPreviewBadge) {
    avatarUploadInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          transientAvatarDataUrl = evt.target.result;
          avatarPreviewBadge.style.backgroundImage = `url('${transientAvatarDataUrl}')`;
          avatarPreviewBadge.style.display = "block";
        }
        reader.readAsDataURL(file);
      }
    };
  }

  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector(".auth-action-submit-btn");
      if (submitBtn) submitBtn.disabled = true;

      const firstName = document.getElementById("reg-firstname").value.trim();
      const email = document.getElementById("reg-email").value.trim().toLowerCase();
      const password = document.getElementById("reg-password").value;

      const userExists = await dbFetchUserData(email);
      if (userExists) {
        alert("This email address is already connected to another profile!");
        if (submitBtn) submitBtn.disabled = false; return;
      }

      const newProfile = { firstName, password, avatar: transientAvatarDataUrl || "" };
      const saveResult = await dbSaveNewUser(email, newProfile);

      if (saveResult && saveResult.success) {
        alert("Registration complete! Please log in.");
        registerForm.reset();
        if (avatarPreviewBadge) avatarPreviewBadge.style.display = "none";
        transientAvatarDataUrl = "";
        if (toggleLoginViewBtn) toggleLoginViewBtn.click();
      }
      if (submitBtn) submitBtn.disabled = false;
    };
  }

  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value;

      const userProfile = await dbFetchUserData(email);
      const databasePassword = userProfile ? (userProfile.password) : null;

      if (!userProfile || databasePassword !== password) {
        alert("Invalid credentials! Please try again."); return;
      }

      sessionStorage.setItem("active_wardrobe_session_user", email);
      initializeAuthenticatedSession(userProfile, email);
      loginForm.reset();
    };
  }

  function initializeAuthenticatedSession(profileObj, userEmail) {
    if (authGateway) authGateway.style.display = "none";
    if (mainAppWrapper) mainAppWrapper.classList.add("authenticated");

    const firstNameVal = profileObj.first_name || profileObj.firstName || "User";
    if (userDisplayName) userDisplayName.textContent = firstNameVal;
    if (userProfileCard) userProfileCard.style.display = "flex";

    const userAvatar = profileObj.avatar_data_url || profileObj.avatar;
    if (userAvatar && userAvatarDisplay) {
      userAvatarDisplay.textContent = ""; userAvatarDisplay.style.backgroundImage = `url('${userAvatar}')`;
    } else if (userAvatarDisplay) {
      userAvatarDisplay.textContent = firstNameVal.charAt(0).toUpperCase(); userAvatarDisplay.style.backgroundImage = "none";
    }

    const dynamicUserCacheKey = `wardrobe_weekly_cache_${userEmail}`;
    weeklyOutfitsArchive = JSON.parse(localStorage.getItem(dynamicUserCacheKey)) || { 
      monday: null, tuesday: null, wednesday: null, thursday: null, friday: null 
    };
    
    dayButtons.forEach(b => b.classList.remove("active-day"));
    if (activeDayHeading) activeDayHeading.textContent = "Selected Day: None (Choose below)";
    maleSelects.forEach(box => { box.value = ""; box.dispatchEvent(new Event('change')); });
    femaleSelects.forEach(box => { box.value = ""; box.dispatchEvent(new Event('change')); });
    renderDynamicOutfitPreview();
  }

  if (appSignoutActionBtn) {
    appSignoutActionBtn.onclick = () => {
      sessionStorage.removeItem("active_wardrobe_session_user");
      if (mainAppWrapper) mainAppWrapper.classList.remove("authenticated");
      if (authGateway) authGateway.style.display = "flex";
      if (userProfileCard) userProfileCard.style.display = "none";
    };
  }

  const activeUserKeyToken = sessionStorage.getItem("active_wardrobe_session_user");
  if (activeUserKeyToken) {
    dbFetchUserData(activeUserKeyToken).then(userProfile => {
      if (userProfile) initializeAuthenticatedSession(userProfile, activeUserKeyToken);
    });
  }


    // ==========================================
  // 5. CENTRAL WARDROBE GENDER INTERACTION TRACK
  // ==========================================
  if (maleBtn && femaleBtn) {
    maleBtn.onclick = () => {
      maleBtn.classList.add("active");
      femaleBtn.classList.remove("active");
      if (malePanel) malePanel.style.display = "block";
      if (femalePanel) femalePanel.style.display = "none";
      renderDynamicOutfitPreview();
    };

    femaleBtn.onclick = () => {
      femaleBtn.classList.add("active");
      maleBtn.classList.remove("active");
      if (femalePanel) femalePanel.style.display = "block";
      if (malePanel) malePanel.style.display = "none";
      renderDynamicOutfitPreview();
    };
  }

  const saveMaleBtn = document.getElementById("save-male-outfit");
  const saveFemaleBtn = document.getElementById("save-female-outfit");

  function processOutfitCommit(genderMode, dropdownSelectors) {
    if (!activePlannedDay) {
      alert("Please select a day of the week from the dashboard first before saving your layout!");
      return;
    }

    const compiledOutfitFile = { gender: genderMode, details: {} };
    
    dropdownSelectors.forEach(selectBox => {
      const labelElement = selectBox.previousElementSibling;
      const labelText = labelElement ? labelElement.textContent.replace(":", "").trim() : selectBox.id;
      compiledOutfitFile.details[labelText] = selectBox.value || "None";
    });

    weeklyOutfitsArchive[activePlannedDay] = compiledOutfitFile;

    const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user");
    if (activeSessionEmail) {
       localStorage.setItem(`wardrobe_weekly_cache_${activeSessionEmail}`, JSON.stringify(weeklyOutfitsArchive));
    }

    alert(`Success! Your look for ${activePlannedDay.toUpperCase()} has been locked.`);
  }

  if (saveMaleBtn) saveMaleBtn.onclick = () => processOutfitCommit("Male", maleSelects);
  if (saveFemaleBtn) saveFemaleBtn.onclick = () => processOutfitCommit("Female", femaleSelects);

  dayButtons.forEach((btn) => {
    btn.onclick = () => {
      dayButtons.forEach(b => b.classList.remove("active-day"));
      btn.classList.add("active-day");
      activePlannedDay = btn.getAttribute("data-day");
      
      if (activeDayHeading) {
        activeDayHeading.textContent = `Selected Day: ${activePlannedDay.toUpperCase()}`;
        activeDayHeading.style.color = "#0284c7";
        activeDayHeading.style.fontWeight = "700";
      }

      const savedOutfit = weeklyOutfitsArchive[activePlannedDay];

      if (savedOutfit) {
        if (savedOutfit.gender === "Male" && maleBtn) {
          maleBtn.click();
          maleSelects.forEach(selectBox => {
            const labelElement = selectBox.previousElementSibling;
            const labelText = labelElement ? labelElement.textContent.replace(":", "").trim() : selectBox.id;
            if (savedOutfit.details[labelText] !== undefined) {
              selectBox.value = savedOutfit.details[labelText] === "None" ? "" : savedOutfit.details[labelText];
            }
          });
        } else if (savedOutfit.gender === "Female" && femaleBtn) {
          femaleBtn.click();
          femaleSelects.forEach(selectBox => {
            const labelElement = selectBox.previousElementSibling;
            const labelText = labelElement ? labelElement.textContent.replace(":", "").trim() : selectBox.id;
            if (savedOutfit.details[labelText] !== undefined) {
              selectBox.value = savedOutfit.details[labelText] === "None" ? "" : savedOutfit.details[labelText];
            }
          });
        }
      } else {
        maleSelects.forEach(box => box.value = "");
        femaleSelects.forEach(box => box.value = "");
      }
      renderDynamicOutfitPreview();
    };
  });

  // Color Section Conditionals with explicit trigger tags
  maleSelects.forEach((selectBox) => {
    selectBox.onchange = () => {
      const topChosen = document.getElementById("male-tops").value !== "";
      const waistChosen = document.getElementById("male-waist").value !== "";
      if (maleColorSection) maleColorSection.style.display = (topChosen && waistChosen) ? "block" : "none";
      renderDynamicOutfitPreview();
    };
  });

  femaleSelects.forEach((selectBox) => {
    selectBox.onchange = () => {
      // 🟢 THE FIX: Enforce color dropdown reveal if *either* a Top OR a Blouse/Gown/Dress is active
      const topChosen = document.getElementById("female-tops").value !== "";
      const waistChosen = document.getElementById("female-waist").value !== "";
      const overallChosen = document.getElementById("female-overall").value !== "";
      
      if (femaleColorSection) {
        femaleColorSection.style.display = ((topChosen && waistChosen) || overallChosen) ? "block" : "none";
      }
      renderDynamicOutfitPreview();
    };
  });

  // ==========================================
  // 6. CATALOGUE LOOKUP & MIRROR ENGINE
  // ==========================================
  const canvasTop = document.getElementById("canvas-top-layer");
  const canvasBottom = document.getElementById("canvas-bottom-layer");
  const canvasShoe = document.getElementById("canvas-shoe-layer");
  
  const canvasTopImg = document.getElementById("canvas-top-img");
  const canvasBottomImg = document.getElementById("canvas-bottom-img");
  const canvasShoeImg = document.getElementById("canvas-shoe-img");

  function renderDynamicOutfitPreview() {
    if (!canvasTop || !canvasBottom || !canvasShoe) return;

    const isMaleActive = malePanel && malePanel.style.display === "block";
    const gender = isMaleActive ? "male" : "female";
    
    const topVal = document.getElementById(`${gender}-tops`) ? document.getElementById(`${gender}-tops`).value : "";
    const waistVal = document.getElementById(`${gender}-waist`) ? document.getElementById(`${gender}-waist`).value : "";
    const shoeVal = document.getElementById(`${gender}-shoes`) ? document.getElementById(`${gender}-shoes`).value : "";
    const overallVal = document.getElementById(`${gender}-overall`) ? document.getElementById(`${gender}-overall`).value : "";
    
    const topColor = document.getElementById(`${gender}-top-color`) ? document.getElementById(`${gender}-top-color`).value : "";
    const waistColor = document.getElementById(`${gender}-waist-color`) ? document.getElementById(`${gender}-waist-color`).value : "";
    const shoeColor = document.getElementById(`${gender}-shoe-color`) ? document.getElementById(`${gender}-shoe-color`).value : "";
    const overallColor = document.getElementById(`${gender}-overall-color`) ? document.getElementById(`${gender}-overall-color`).value : "";

    const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user") || "";
    const currentCatalogue = JSON.parse(localStorage.getItem(`wardrobe_catalogue_db_${activeSessionEmail}`)) || {};

    // 1. RENDER TOP INTERACTIVE IMAGE
    if (overallVal && overallVal !== "") {
      const overallLookupKey = `${gender}_${overallVal}_${overallColor}`;
      if (currentCatalogue[overallLookupKey]) {
        canvasTopImg.src = currentCatalogue[overallLookupKey];
        canvasTopImg.style.display = "block";
        canvasTop.style.display = "none";
      } else {
        canvasTopImg.style.display = "none";
        canvasTop.style.display = "block";
        canvasTop.textContent = `🧥 [No Image] ${overallColor.toUpperCase()} ${overallVal.toUpperCase()}`;
      }
    } else if (topVal) {
      const topLookupKey = `${gender}_${topVal}_${topColor}`;
      if (currentCatalogue[topLookupKey]) {
        canvasTopImg.src = currentCatalogue[topLookupKey];
        canvasTopImg.style.display = "block";
        canvasTop.style.display = "none";
      } else {
        canvasTopImg.style.display = "none";
        canvasTop.style.display = "block";
        canvasTop.textContent = `👕 [No Image] ${topColor.toUpperCase()} ${topVal.replace("-", " ")}`;
      }
    } else {
      canvasTopImg.style.display = "none";
      canvasTop.style.display = "block";
      canvasTop.textContent = "─ Choose a Top ─";
    }

    // 2. RENDER WAIST INTERACTIVE IMAGE
    if (waistVal && !(overallVal && ["dress"].includes(overallVal))) {
      const waistLookupKey = `${gender}_${waistVal}_${waistColor}`;
      if (currentCatalogue[waistLookupKey]) {
        canvasBottomImg.src = currentCatalogue[waistLookupKey];
        canvasBottomImg.style.display = "block";
        canvasBottom.style.display = "none";
      } else {
        canvasBottomImg.style.display = "none";
        canvasBottom.style.display = "block";
        canvasBottom.textContent = `👖 [No Image] ${waistColor.toUpperCase()} ${waistVal.toUpperCase()}`;
      }
    } else {
      canvasBottomImg.style.display = "none";
      canvasBottom.style.display = "block";
      canvasBottom.textContent = overallVal === "dress" ? "👗 Gown Active" : "─ Choose a Waist ─";
    }

    // 3. RENDER SHOE INTERACTIVE IMAGE
    if (shoeVal) {
      const shoeLookupKey = `${gender}_${shoeVal}_${shoeColor}`;
      if (currentCatalogue[shoeLookupKey]) {
        canvasShoeImg.src = currentCatalogue[shoeLookupKey];
        canvasShoeImg.style.display = "block";
        canvasShoe.style.display = "none";
      } else {
        canvasShoeImg.style.display = "none";
        canvasShoe.style.display = "block";
        canvasShoe.textContent = `👞 [No Image] ${shoeColor.toUpperCase()} ${shoeVal.toUpperCase()}`;
      }
    } else {
      canvasShoeImg.style.display = "none";
      canvasShoe.style.display = "block";
      canvasShoe.textContent = "─ Choose Shoes ─";
    }
  }


    // ==========================================
  // 7. THE WEEK DATA RESET ENGINE
  // ==========================================
  const resetWeekBtn = document.getElementById("reset-week-btn");
  if (resetWeekBtn) {
    resetWeekBtn.onclick = () => {
      const userConfirmed = confirm("Are you sure you want to clear your entire schedule for this week?");
      if (!userConfirmed) return;

      const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user");
      if (activeSessionEmail) {
        localStorage.removeItem(`wardrobe_weekly_cache_${activeSessionEmail}`);
      }

      for (const day in weeklyOutfitsArchive) { weeklyOutfitsArchive[day] = null; }
      dayButtons.forEach(b => b.classList.remove("active-day"));
      activePlannedDay = ""; 
      
      if (activeDayHeading) {
        activeDayHeading.textContent = "Selected Day: None (Choose below)";
        activeDayHeading.style.color = "#64748b";
      }

      maleSelects.forEach(box => box.value = "");
      femaleSelects.forEach(box => box.value = "");
      renderDynamicOutfitPreview();
      alert("Weekly planner cleared!");
    };
  }

    // ==========================================
  // 8. COMMUNITY CHAT DRAWER LOGIC (SUPABASE DIRECT SYNC)
  // ==========================================
  const chatToggle = document.getElementById("chat-toggle-widget");
  const chatDrawer = document.getElementById("community-chat-room");
  const closeChat = document.getElementById("close-chat-btn");
  const sendLookBtn = document.getElementById("send-look-btn");
  const chatMessageInput = document.getElementById("chat-message-input");
  const chatFeedViewport = document.getElementById("chat-feed-viewport");
  const chatLookUpload = document.getElementById("chat-look-upload");

  let communityPosts = [];

  async function fetchGlobalCommunityFeed() {
    if (!supabaseClient) {
      if (chatFeedViewport) chatFeedViewport.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API Configuration Error: Supabase credentials are missing at the top of script.js</div>`;
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch error:", error.message);
        return;
      }

      if (data) {
        communityPosts = data.map(item => ({
          id: item.id,
          author: item.author_name,
          time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          caption: item.caption,
          image: item.image_url,
          likes: item.likes_count,
          likedByArray: item.liked_by_array || [],
          comments: item.comments_json || []
        }));
        drawFeedCardsToScreen();
      }
    } catch (err) {
      console.error("Global stream network failure:", err);
    }
  }

  async function syncFeedToGlobalCloudNetwork(index, updatedPostObj) {
    if (!supabaseClient || !updatedPostObj.id) return;
    try {
      await supabaseClient
        .from('community_posts')
        .update({
          likes_count: updatedPostObj.likes,
          liked_by_array: updatedPostObj.likedByArray,
          comments_json: updatedPostObj.comments
        })
        .eq('id', updatedPostObj.id);
      drawFeedCardsToScreen();
    } catch (err) { console.error("Cloud write sync issue:", err); }
  }

  function drawFeedCardsToScreen() {
    if (!chatFeedViewport) return;
    chatFeedViewport.innerHTML = ""; 

    const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user") || "Guest";

    if (communityPosts.length === 0) {
      chatFeedViewport.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#94a3b8; font-size:0.9rem;">✨ No styles shared yet. Send a message to start the global feed!</div>`;
      return;
    }

    communityPosts.forEach((post, index) => {
      const dynamicCard = document.createElement("div");
      dynamicCard.className = "community-look-card";
      
      let imageTag = "";
      if (post.image) {
        imageTag = `<img src="${post.image}" alt="Outfit" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px; margin:8px 0;" />`;
      } else {
        imageTag = `<div class="card-outfit-image-placeholder" style="background-color:#f1f5f9; color:#64748b; font-size:0.8rem; padding:12px; text-align:center; border-radius:6px; margin:8px 0;">✨ Style Tip shared</div>`;
      }

      let commentsHTML = "";
      if (post.comments && post.comments.length > 0) {
        commentsHTML = `<div class="card-comments-list-box" style="background:#f8fafc; border-radius:8px; padding:10px; margin-top:10px; display:flex; flex-direction:column; gap:6px; border:1px solid #e2e8f0;">`;
        post.comments.forEach(c => {
          commentsHTML += `<p style="font-size:0.8rem; color:#475569; margin:0;"><strong style="color:#0f172a;">${c.user}:</strong> ${c.text}</p>`;
        });
        commentsHTML += `</div>`;
      }

      const viewerHasLiked = post.likedByArray && post.likedByArray.includes(activeSessionEmail);

      dynamicCard.innerHTML = `
        <div class="card-author-line">
          <strong>${post.author}</strong> <span class="card-timestamp">${post.time}</span>
        </div>
        ${imageTag}
        <p class="card-caption">${post.caption}</p>
        <div class="card-actions-bar">
          <button class="card-like-btn ${viewerHasLiked ? 'liked' : ''}" data-index="${index}">❤️ Like (<span class="like-num">${post.likes || 0}</span>)</button>
          <button class="card-comment-trigger-btn" data-index="${index}">💬 Comment</button>
        </div>
        ${commentsHTML}
      `;
      chatFeedViewport.appendChild(dynamicCard);
    });

    document.querySelectorAll(".card-like-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-index");
        if (communityPosts[idx]) {
          if (!communityPosts[idx].likedByArray) communityPosts[idx].likedByArray = [];
          if (communityPosts[idx].likedByArray.includes(activeSessionEmail)) {
            communityPosts[idx].likedByArray = communityPosts[idx].likedByArray.filter(e => e !== activeSessionEmail);
            communityPosts[idx].likes = Math.max(0, communityPosts[idx].likes - 1);
          } else {
            communityPosts[idx].likedByArray.push(activeSessionEmail);
            communityPosts[idx].likes = (communityPosts[idx].likes || 0) + 1;
          }
          syncFeedToGlobalCloudNetwork(idx, communityPosts[idx]);
        }
      };
    });

    document.querySelectorAll(".card-comment-trigger-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-index");
        const replyText = prompt("Type your comment reply:");
        if (replyText && replyText.trim() !== "") {
          const usersMap = JSON.parse(localStorage.getItem("wardrobe_users_db")) || {};
          const currentUserName = usersMap[activeSessionEmail] ? usersMap[activeSessionEmail].firstName : "Local User";
          if (!communityPosts[idx].comments) communityPosts[idx].comments = [];
          communityPosts[idx].comments.push({ user: currentUserName, text: replyText.trim() });
          syncFeedToGlobalCloudNetwork(idx, communityPosts[idx]);
        }
      };
    });
  }

  if (chatToggle && chatDrawer && closeChat) {
    chatToggle.onclick = () => {
      chatDrawer.style.display = "flex"; chatToggle.style.display = "none";
      // 🟢 THE INTENT: Grant permissions safely within a valid click handler context frame
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
      fetchGlobalCommunityFeed(); 
    };
    closeChat.onclick = () => { chatDrawer.style.display = "none"; chatToggle.style.display = "flex"; };
  }

  if (sendLookBtn && chatMessageInput) {
    sendLookBtn.onclick = async () => {
      const textMessage = chatMessageInput.value.trim();
      const hasFile = chatLookUpload && chatLookUpload.files && chatLookUpload.files.length > 0;
      if (textMessage === "" && !hasFile) return;

      if (!supabaseClient) {
        alert("Cannot publish post. Supabase credentials are missing at the top of script.js");
        return;
      }

      const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user") || "Guest";
      const usersMap = JSON.parse(localStorage.getItem("wardrobe_users_db")) || {};
      const activeUserName = usersMap[activeSessionEmail] ? usersMap[activeSessionEmail].firstName : "Local User";

      let finalImageString = "";
      if (hasFile) {
        const file = chatLookUpload.files[0];
        if (file.size > 200 * 1024) {
          finalImageString = URL.createObjectURL(file);
          // Insert text globally to cloud, appending local picture tracking attributes
          await insertPostToSupabaseTable(activeUserName, activeSessionEmail, textMessage, finalImageString);
        } else {
          const reader = new FileReader();
          reader.onload = async function(evt) { 
            await insertPostToSupabaseTable(activeUserName, activeSessionEmail, textMessage, evt.target.result); 
          };
          reader.readAsDataURL(file);
        }
      } else {
        await insertPostToSupabaseTable(activeUserName, activeSessionEmail, textMessage, "");
      }
    };
  }

  async function insertPostToSupabaseTable(authorName, authorEmail, messageText, imageData) {
    try {
      const { error } = await supabaseClient
        .from('community_posts')
        .insert([{
          author_name: authorName,
          author_email: authorEmail,
          caption: messageText,
          image_url: imageData
        }]);

      if (error) {
        alert(`Cloud storage insertion failed: ${error.message}`);
        return;
      }
      
      chatMessageInput.value = "";
      if (chatLookUpload) chatLookUpload.value = "";
      fetchGlobalCommunityFeed();
    } catch (err) { console.error("Cloud insert error:", err); }
  }

  fetchGlobalCommunityFeed();



    // ==========================================
  // 9. AUTOMATED AUDIBLE ALARM ENGINE (WAT STABILIZED)
  // ==========================================
  let lastTriggeredDate8PM = "";
  let lastTriggeredDate4PM = "";

  function checkWeeklyScheduleAlarms() {
    const now = new Date();
    
    // Explicitly target West Africa Time formatting options models
    const watTimeStr = now.toLocaleTimeString("en-US", { timeZone: "Africa/Lagos", hour12: false });
    const watDayStr = now.toLocaleDateString("en-US", { timeZone: "Africa/Lagos", weekday: "long" }).toLowerCase();
    const watDateKey = now.toLocaleDateString("en-US", { timeZone: "Africa/Lagos" });
    
    const currentWATTime = watTimeStr.substring(0, 5); 
    const currentHour = parseInt(currentWATTime.substring(0,2));

    const alarmAudio = document.getElementById("app-alarm-audio");

    // ALARM 1: Sunday through Thursday at 8:00 PM WAT onwards (Hour >= 20)
    const isPlanningDay = ["sunday", "monday", "tuesday", "wednesday", "thursday"].includes(watDayStr);
    if (isPlanningDay && currentHour >= 23 && lastTriggeredDate8PM !== watDateKey) {
      const dayMap = { sunday: "monday", monday: "tuesday", tuesday: "wednesday", wednesday: "thursday", thursday: "friday" };
      const followingDayName = dayMap[watDayStr];

      lastTriggeredDate8PM = watDateKey; // Freeze loop state so it triggers once per day
      if (alarmAudio) alarmAudio.play().catch(e => console.log("Audio play blocked by browser user interaction rules:", e));
      
      if (Notification.permission === "granted") {
        new Notification("👔 Wardrobe Outfit Reminder", {
          body: `Please confirm and log your outfit options blueprint for tomorrow (${followingDayName.toUpperCase()}).`,
          icon: "https://flaticon.com"
        });
      } else {
        alert(`⏰ Alarm! Please select your wardrobe choices configuration entries for tomorrow (${followingDayName.toUpperCase()})!`);
      }
    }

    // ALARM 2: Sunday at 4:00 PM WAT onwards (Hour >= 16)
    if (watDayStr === "sunday" && currentHour >= 16 && lastTriggeredDate4PM !== watDateKey) {
      lastTriggeredDate4PM = watDateKey;
      if (alarmAudio) alarmAudio.play().catch(() => {});

      if (Notification.permission === "granted") {
        new Notification("🗑️ Weekly Reset Alert", {
          body: "Remember to reset your previous week's wardrobe choices and map out your fresh schedule blueprint.",
          icon: "https://flaticon.com"
        });
      } else {
        alert("⏰ Alarm! Remember to clear out your previous week layout matrix and configure your new sets entries!");
      }
    }
  }

  // Poll validation metrics every 15 seconds to ensure accuracy
  setInterval(checkWeeklyScheduleAlarms, 15000);


  // ==========================================
  // 10. MOBILE CONTEXTUAL DRAWER SYSTEM
  // ==========================================
  if (sidebarHeader && !document.getElementById("close-sidebar-utility")) {
    const closeBtn = document.createElement("button");
    closeBtn.id = "close-sidebar-utility";
    closeBtn.className = "close-sidebar-btn";
    closeBtn.innerHTML = "✕";
    sidebarHeader.appendChild(closeBtn);

    closeBtn.onclick = () => { if (sidebarPanel) sidebarPanel.classList.remove("drawer-open"); };
  }

  function openContextualDrawer() {
    if (window.innerWidth <= 768 && sidebarPanel) { sidebarPanel.classList.add("drawer-open"); }
  }

  if (maleBtn) maleBtn.addEventListener("click", openContextualDrawer);
  if (femaleBtn) femaleBtn.addEventListener("click", openContextualDrawer);
  dayButtons.forEach(btn => btn.addEventListener("click", openContextualDrawer));
});

