document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://supabase.com/dashboard/project/ibdhreylfyzdvzkiexfs/settings/api-keys/legacy";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZGhyZXlsZnl6ZHZ6a2lleGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODU0OTQsImV4cCI6MjEwMzc2MTQ5NH0.53fjsCbn8z-2egy4wGcpqnLloWwKFOw2ZIDZrYMrR40";
  
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  
  // 1. SELECTOR HOOKS & BASE VARIABLES
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

  // Auth & UI Framework Shell Elements
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

  // 2. THE DYNAMIC ACCOUNT WARDROBE CATALOGUE SYSTEM
  let wardrobeCatalogue = {};

  const wearUpload = document.getElementById("wear-upload");
  const uploadGender = document.getElementById("upload-item-gender");
  const uploadType = document.getElementById("upload-item-type");
  const uploadColor = document.getElementById("upload-item-color");

  if (wearUpload) {
    wearUpload.addEventListener("change", (e) => {
      const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user");
      if (!activeSessionEmail) {
        alert("Session error! Please log in first.");
        return;
      }

      const file = e.target.files; 
      if (file && file[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const gender = uploadGender.value;
          const type = uploadType.value;
          const color = uploadColor.value;

          const uniqueCatalogKey = `${gender}_${type}_${color}`;
          
          // 🟢 FIX 1: Save data under a key unique to the active user's email address
          const dynamicUserCatalogueKey = `wardrobe_catalogue_db_${activeSessionEmail}`;
          wardrobeCatalogue = JSON.parse(localStorage.getItem(dynamicUserCatalogueKey)) || {};
          wardrobeCatalogue[uniqueCatalogKey] = evt.target.result;
          
          localStorage.setItem(dynamicUserCatalogueKey, JSON.stringify(wardrobeCatalogue));
          
          alert(`Catalogue Updated! Successfully added 1 item under key: [${uniqueCatalogKey.toUpperCase()}]`);
          wearUpload.value = ""; 
          renderDynamicOutfitPreview();
        };
        reader.readAsDataURL(file[0]);
      }
    });
  }

  // 3. MOCK ONLINE DATABASE LAYER
  async function dbFetchUserData(email) {
    if (!email) return null;
    try {
      const { data, error } = await supabase
        .from('wardrobe_users_db') // References your cloud credentials table
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Database query failed:", error.message);
        return null;
      }
      return data; // Returns the user profile object (firstName, password, avatar string)
    } catch (err) {
      console.error("Network connectivity exception:", err);
      return null;
    }
  }

  async function dbSaveNewUser(email, userDataProfile) {
    try {
      const { error } = await supabase
        .from('wardrobe_users_db')
        .insert([{
          email: email.toLowerCase(),
          first_name: userDataProfile.firstName,
          password: userDataProfile.password, // Standard plaintext for testing; hash in production
          avatar_data_url: userDataProfile.avatar || ""
        }]);

      if (error) {
        console.error("Database storage failed:", error.message);
        alert(`Cloud Error: ${error.message}`);
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      console.error("Network injection exception:", err);
      return { success: false };
    }
  }


  // 4. AUTHENTICATION SYSTEMS
  if (toggleLoginViewBtn && toggleRegisterViewBtn && loginForm && registerForm) {
    toggleLoginViewBtn.addEventListener("click", () => {
      toggleLoginViewBtn.classList.add("active");
      toggleRegisterViewBtn.classList.remove("active");
      loginForm.style.display = "flex";
      registerForm.style.display = "none";
    });

    toggleRegisterViewBtn.addEventListener("click", () => {
      toggleRegisterViewBtn.classList.add("active");
      toggleLoginViewBtn.classList.remove("active");
      registerForm.style.display = "flex";
      loginForm.style.display = "none";
    });
  }

  if (avatarUploadInput && avatarPreviewBadge) {
    avatarUploadInput.addEventListener("change", (e) => {
      const file = e.target.files;
      if (file && file[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          transientAvatarDataUrl = evt.target.result;
          avatarPreviewBadge.style.backgroundImage = `url('${transientAvatarDataUrl}')`;
          avatarPreviewBadge.style.display = "block";
        }
        reader.readAsDataURL(file[0]);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const firstName = document.getElementById("reg-firstname").value.trim();
      const email = document.getElementById("reg-email").value.trim().toLowerCase();
      const password = document.getElementById("reg-password").value;

      const userExists = await dbFetchUserData(email);
      if (userExists) {
        alert("This email address is already connected to another profile!");
        return;
      }

      const newProfile = { firstName, password, avatar: transientAvatarDataUrl || "" };
      await dbSaveNewUser(email, newProfile);

      alert("Registration complete! Please log in.");
      registerForm.reset();
      if (avatarPreviewBadge) avatarPreviewBadge.style.display = "none";
      transientAvatarDataUrl = "";
      if (toggleLoginViewBtn) toggleLoginViewBtn.click();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value;

      const userProfile = await dbFetchUserData(email);

      if (!userProfile || userProfile.password !== password) {
        alert("Invalid credentials! Please try again.");
        return;
      }

      sessionStorage.setItem("active_wardrobe_session_user", email);
      initializeAuthenticatedSession(userProfile, email);
      loginForm.reset();
    });
  }

  function initializeAuthenticatedSession(profileObj, userEmail) {
    if (authGateway) authGateway.style.display = "none";
    if (mainAppWrapper) mainAppWrapper.classList.add("authenticated");

    if (userDisplayName) userDisplayName.textContent = profileObj.firstName;
    if (userProfileCard) userProfileCard.style.display = "flex";

    if (profileObj.avatar && userAvatarDisplay) {
      userAvatarDisplay.textContent = "";
      userAvatarDisplay.style.backgroundImage = `url('${profileObj.avatar}')`;
    } else if (userAvatarDisplay) {
      userAvatarDisplay.textContent = profileObj.firstName.charAt(0).toUpperCase();
      userAvatarDisplay.style.backgroundImage = "none";
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
    appSignoutActionBtn.addEventListener("click", () => {
      sessionStorage.removeItem("active_wardrobe_session_user");
      if (mainAppWrapper) mainAppWrapper.classList.remove("authenticated");
      if (authGateway) authGateway.style.display = "flex";
      if (userProfileCard) userProfileCard.style.display = "none";
    });
  }

  const activeUserKeyToken = sessionStorage.getItem("active_wardrobe_session_user");
  if (activeUserKeyToken) {
    dbFetchUserData(activeUserKeyToken).then(userProfile => {
      if (userProfile) initializeAuthenticatedSession(userProfile, activeUserKeyToken);
    });
  }

  // 5. CENTRAL WARDROBE GENDER INTERACTION TRACK
  if (maleBtn && femaleBtn) {
    maleBtn.addEventListener("click", () => {
      maleBtn.classList.add("active");
      femaleBtn.classList.remove("active");
      if (malePanel) malePanel.style.display = "block";
      if (femalePanel) femalePanel.style.display = "none";
      renderDynamicOutfitPreview();
    });

    femaleBtn.addEventListener("click", () => {
      femaleBtn.classList.add("active");
      maleBtn.classList.remove("active");
      if (femalePanel) femalePanel.style.display = "block";
      if (malePanel) malePanel.style.display = "none";
      renderDynamicOutfitPreview();
    });
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
      compiledOutfitFile.details[labelText] = selectBox.value || "Not Selected";
    });

    weeklyOutfitsArchive[activePlannedDay] = compiledOutfitFile;

    const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user");
    if (activeSessionEmail) {
       localStorage.setItem(`wardrobe_weekly_cache_${activeSessionEmail}`, JSON.stringify(weeklyOutfitsArchive));
    }

    alert(`Success! Your look for ${activePlannedDay.toUpperCase()} has been locked.`);
  }

  if (saveMaleBtn) saveMaleBtn.addEventListener("click", () => processOutfitCommit("Male", maleSelects));
  if (saveFemaleBtn) saveFemaleBtn.addEventListener("click", () => processOutfitCommit("Female", femaleSelects));

  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
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
              selectBox.value = savedOutfit.details[labelText] === "Not Selected" ? "" : savedOutfit.details[labelText];
            }
          });
        } else if (savedOutfit.gender === "Female" && femaleBtn) {
          femaleBtn.click();
          femaleSelects.forEach(selectBox => {
            const labelElement = selectBox.previousElementSibling;
            const labelText = labelElement ? labelElement.textContent.replace(":", "").trim() : selectBox.id;
            if (savedOutfit.details[labelText] !== undefined) {
              selectBox.value = savedOutfit.details[labelText] === "Not Selected" ? "" : savedOutfit.details[labelText];
            }
          });
        }
      } else {
        maleSelects.forEach(box => box.value = "");
        femaleSelects.forEach(box => box.value = "");
      }
      renderDynamicOutfitPreview();
    });
  });

  maleSelects.forEach((selectBox) => {
    selectBox.addEventListener("change", () => {
      const topChosen = document.getElementById("male-tops").value !== "";
      const waistChosen = document.getElementById("male-waist").value !== "";
      if (maleColorSection) maleColorSection.style.display = (topChosen && waistChosen) ? "block" : "none";
      renderDynamicOutfitPreview();
    });
  });

  femaleSelects.forEach((selectBox) => {
    selectBox.addEventListener("change", () => {
      const topChosen = document.getElementById("female-tops").value !== "";
      const waistChosen = document.getElementById("female-waist").value !== "";
      if (femaleColorSection) femaleColorSection.style.display = (topChosen && waistChosen) ? "block" : "none";
      renderDynamicOutfitPreview();
    });
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
    
    // 1. Read category types safely from the dropdown menus
    const topVal = document.getElementById(`${gender}-tops`) ? document.getElementById(`${gender}-tops`).value : "";
    const waistVal = document.getElementById(`${gender}-waist`) ? document.getElementById(`${gender}-waist`).value : "";
    const shoeVal = document.getElementById(`${gender}-shoes`) ? document.getElementById(`${gender}-shoes`).value : "";
    const overallVal = document.getElementById(`${gender}-overall`) ? document.getElementById(`${gender}-overall`).value : "";
    
    // 2. Read color selections safely
    const topColorEl = document.getElementById(`${gender}-top-color`);
    const waistColorEl = document.getElementById(`${gender}-waist-color`);
    const shoeColorEl = document.getElementById(`${gender}-shoe-color`);
    const overallColorEl = document.getElementById(`${gender}-overall-color`);

    const topColor = topColorEl ? topColorEl.value : "";
    const waistColor = waistColorEl ? waistColorEl.value : "";
    const shoeColor = shoeColorEl ? shoeColorEl.value : "";
    const overallColor = overallColorEl ? overallColorEl.value : "";

    // 3. Fetch your personal wardrobe database snapshot from local memory storage
    const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user") || "";
    const currentCatalogue = JSON.parse(localStorage.getItem(`wardrobe_catalogue_db_${activeSessionEmail}`)) || {};

    // --- RENDER 1: TOP LAYER PICTURE ---
    if (overallVal && overallVal !== "none") {
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

    // --- RENDER 2: WAIST LAYER PICTURE (CLEANED EXTRA FABRIC ARTIFACTS) ---
    if (waistVal) {
      // 🟢 THE FIX: Standardize lookups directly to the clean "gender_type_color" format with no exceptions
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
      canvasBottom.textContent = "─ Choose a Waist ─";
    }

    // --- RENDER 3: SHOE LAYER PICTURE ---
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



  // 7. THE WEEK DATA RESET ENGINE
  const resetWeekBtn = document.getElementById("reset-week-btn");
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener("click", () => {
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
    });
  }

  // 8. COMMUNITY CHAT DRAWER LOGIC (WITH REAL-TIME COMMENT TRACKS)
  const chatToggle = document.getElementById("chat-toggle-widget");
  const chatDrawer = document.getElementById("community-chat-room");
  const closeChat = document.getElementById("close-chat-btn");
  const sendLookBtn = document.getElementById("send-look-btn");
  const chatMessageInput = document.getElementById("chat-message-input");
  const chatFeedViewport = document.getElementById("chat-feed-viewport");
  const chatLookUpload = document.getElementById("chat-look-upload");

  let communityPosts = JSON.parse(localStorage.getItem("wardrobe_community_posts")) || [];

  function renderCommunityLookFeed() {
    if (!chatFeedViewport) return;
    chatFeedViewport.innerHTML = ""; 

    const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user") || "Guest";

    if (communityPosts.length === 0) {
      chatFeedViewport.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#94a3b8; font-size:0.9rem;">
          ✨ No styles shared yet. Be the first to publish your outfit blueprint!
        </div>`;
      return;
    }

    communityPosts.forEach((post, index) => {
      const dynamicCard = document.createElement("div");
      dynamicCard.className = "community-look-card";
      
      let imageTag = "";
      if (post.image) {
        imageTag = `<img src="${post.image}" alt="Community uploaded outfit" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px; margin:8px 0;" />`;
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
          <button class="card-like-btn ${viewerHasLiked ? 'liked' : ''}" data-index="${index}">
            ❤️ Like (<span class="like-num">${post.likes || 0}</span>)
          </button>
          <button class="card-comment-trigger-btn" data-index="${index}">💬 Comment</button>
        </div>
        ${commentsHTML}
      `;
      chatFeedViewport.appendChild(dynamicCard);
    });

    document.querySelectorAll(".card-like-btn").forEach(btn => {
      btn.addEventListener("click", () => {
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
          localStorage.setItem("wardrobe_community_posts", JSON.stringify(communityPosts));
          renderCommunityLookFeed();
        }
      });
    });

    document.querySelectorAll(".card-comment-trigger-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = btn.getAttribute("data-index");
        const replyText = prompt("Type your comment reply to this community style card:");
        
        if (replyText && replyText.trim() !== "") {
          const usersMap = JSON.parse(localStorage.getItem("wardrobe_users_db")) || {};
          const currentUserName = usersMap[activeSessionEmail] ? usersMap[activeSessionEmail].firstName : "Local User";

          if (!communityPosts[idx].comments) communityPosts[idx].comments = [];
          
          communityPosts[idx].comments.push({
            user: currentUserName,
            text: replyText.trim()
          });

          localStorage.setItem("wardrobe_community_posts", JSON.stringify(communityPosts));
          renderCommunityLookFeed();
        }
      });
    });
  }

  if (chatToggle && chatDrawer && closeChat) {
    chatToggle.addEventListener("click", () => {
      chatDrawer.style.display = "flex";
      chatToggle.style.display = "none";
      renderCommunityLookFeed(); 
    });

    closeChat.addEventListener("click", () => {
      chatDrawer.style.display = "none";
      chatToggle.style.display = "flex";
    });
  }

  if (sendLookBtn && chatMessageInput) {
    sendLookBtn.addEventListener("click", () => {
      const textMessage = chatMessageInput.value.trim();
      const hasImage = chatLookUpload && chatLookUpload.files && chatLookUpload.files.length > 0;
      if (textMessage === "" && !hasImage) return;

      const activeSessionEmail = sessionStorage.getItem("active_wardrobe_session_user") || "Guest";
      const usersMap = JSON.parse(localStorage.getItem("wardrobe_users_db")) || {};
      const activeUserName = usersMap[activeSessionEmail] ? usersMap[activeSessionEmail].firstName : "Local User";

      if (hasImage) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          saveAndPushPost(activeUserName, textMessage, evt.target.result);
        };
        reader.readAsDataURL(chatLookUpload.files[0]);
      } else {
        saveAndPushPost(activeUserName, textMessage, "");
      }
    });
  }

  function saveAndPushPost(authorName, messageText, base64Image) {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newPostObj = {
      author: authorName,
      time: `Today, ${timeString}`,
      caption: messageText,
      image: base64Image,
      likes: 0,
      likedByArray: [],
      comments: [] 
    };

    communityPosts.unshift(newPostObj);
    localStorage.setItem("wardrobe_community_posts", JSON.stringify(communityPosts));
    
    chatMessageInput.value = "";
    if (chatLookUpload) chatLookUpload.value = "";
    
    renderCommunityLookFeed();
  }

  renderCommunityLookFeed();


  // 9. MOBILE CONTEXTUAL DRAWER SYSTEM
  if (sidebarHeader && !document.getElementById("close-sidebar-utility")) {
    const closeBtn = document.createElement("button");
    closeBtn.id = "close-sidebar-utility";
    closeBtn.className = "close-sidebar-btn";
    closeBtn.innerHTML = "✕";
    sidebarHeader.appendChild(closeBtn);

    closeBtn.addEventListener("click", () => {
      if (sidebarPanel) sidebarPanel.classList.remove("drawer-open");
    });
  }

  function openContextualDrawer() {
    if (window.innerWidth <= 768 && sidebarPanel) {
      sidebarPanel.classList.add("drawer-open");
    }
  }

  if (maleBtn) maleBtn.addEventListener("click", openContextualDrawer);
  if (femaleBtn) femaleBtn.addEventListener("click", openContextualDrawer);
  dayButtons.forEach(btn => btn.addEventListener("click", openContextualDrawer));
});
