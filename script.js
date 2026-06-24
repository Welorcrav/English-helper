let currentActiveUser = null
let currentSection = 'vocab'
let userLessonsData = {}
let userSpeakingData = {}
let currentLesson = ''
let currentTopic = ''
let cardsList = []
let currentIndex = 0
let isEnToUz = true
let isListView = false
let isLoginMode = true

// XAVFSIZLIK: XSS hujumlarini oldini olish uchun HTML elementlarini tozalash (Escape)
function escapeHTML(str) {
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function checkAuthStatus() {
  const savedUser = localStorage.getItem('logged_in_user')
  if (savedUser) loadUserSession(savedUser)
  else showAuthScreen()
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex'
  document.getElementById('app-screen').style.display = 'none'
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode
  const title = document.getElementById('auth-title')
  const subtitle = document.getElementById('auth-subtitle')
  const btn = document.getElementById('auth-main-btn')
  const toggleText = document.getElementById('auth-toggle-text')
  const toggleLink = document.getElementById('auth-toggle-link')

  document.getElementById('auth-username').value = ''
  document.getElementById('auth-password').value = ''

  const passwordInput = document.getElementById('auth-password')
  const eyeBtn = document.getElementById('toggle-password-eye')
  passwordInput.type = 'password'
  eyeBtn.textContent = '👁️'

  if (isLoginMode) {
    title.textContent = 'Tizimga Kirish'
    subtitle.textContent = 'Platformadan foydalanish uchun profilingizga kiring'
    btn.textContent = 'Kirish'
    toggleText.textContent = "Akkauntingiz yo'qmi?"
    toggleLink.textContent = "Ro'yxatdan o'tish"
  } else {
    title.textContent = 'Yangi Profil Yaratish'
    subtitle.textContent = "Takrorlanmas nom va xavfsiz parol o'ylab toping"
    btn.textContent = "Ro'yxatdan O'tish"
    toggleText.textContent = 'Akkauntingiz bormi?'
    toggleLink.textContent = 'Kirish qismi'
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('auth-password')
  const eyeBtn = document.getElementById('toggle-password-eye')
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text'
    eyeBtn.textContent = '🙈'
  } else {
    passwordInput.type = 'password'
    eyeBtn.textContent = '👁️'
  }
}

function handleAuth() {
  const usernameInput = document.getElementById('auth-username').value.trim()
  const passwordInput = document.getElementById('auth-password').value.trim()

  if (!usernameInput || !passwordInput) {
    alert("Iltimos, barcha maydonlarni to'ldiring!")
    return
  }

  let allUsers = JSON.parse(localStorage.getItem('app_users_db')) || {}

  if (isLoginMode) {
    // XAVFSIZLIK: Kirishda parolni btoa() shifri bilan tekshirish
    if (allUsers[usernameInput] && allUsers[usernameInput].password === btoa(passwordInput)) {
      localStorage.setItem('logged_in_user', usernameInput)
      loadUserSession(usernameInput)
    } else {
      alert("Foydalanuvchi nomi yoki parol noto'g'ri!")
    }
  } else {
    if (allUsers[usernameInput]) {
      alert('Bu foydalanuvchi nomi band!')
      return
    }

    // XAVFSIZLIK: Parolni bazaga ochiq holatda emas, btoa() shifri bilan saqlash
    allUsers[usernameInput] = {
      password: btoa(passwordInput),
      lessons: {},
      speaking: {},
    }

    localStorage.setItem('app_users_db', JSON.stringify(allUsers))
    alert('Profil yaratildi! Kirishingiz mumkin.')
    isLoginMode = false
    toggleAuthMode()
  }
}

function loadUserSession(username) {
  currentActiveUser = username
  document.getElementById('user-display-name').textContent = username

  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app-screen').style.display = 'flex'

  let allUsers = JSON.parse(localStorage.getItem('app_users_db')) || {}
  userLessonsData = allUsers[username].lessons || {}
  userSpeakingData = allUsers[username].speaking || {}

  currentLesson =
    localStorage.getItem(`last_lesson_${username}`) || Object.keys(userLessonsData)[0] || ''
  currentTopic =
    localStorage.getItem(`last_topic_${username}`) || Object.keys(userSpeakingData)[0] || ''

  switchSection(currentSection)
}

function saveUserDataToDB() {
  if (!currentActiveUser) return
  let allUsers = JSON.parse(localStorage.getItem('app_users_db')) || {}
  if (allUsers[currentActiveUser]) {
    allUsers[currentActiveUser].lessons = userLessonsData
    allUsers[currentActiveUser].speaking = userSpeakingData
    localStorage.setItem('app_users_db', JSON.stringify(allUsers))
  }
}

function logout() {
  // XAVFSIZLIK: Chiqishdan oldin tasdiqlash so'rash
  if (confirm('Haqiqatan ham profilingizdan chiqmoqchimisiz?')) {
    localStorage.removeItem('logged_in_user')
    currentActiveUser = null
    showAuthScreen()
  }
}

function switchSection(section) {
  currentSection = section
  const vocabTab = document.getElementById('tab-vocab')
  const speakingTab = document.getElementById('tab-speaking')
  const vocabContent = document.getElementById('vocab-section-content')
  const speakingContent = document.getElementById('speaking-section-content')
  const sidebarTitle = document.getElementById('sidebar-title')
  const inputPlaceholder = document.getElementById('new-lesson-input')

  if (section === 'vocab') {
    vocabTab.classList.add('active')
    speakingTab.classList.remove('active')
    vocabContent.style.display = 'flex'
    speakingContent.style.display = 'none'
    sidebarTitle.textContent = 'Darslar'
    inputPlaceholder.placeholder = 'Yangi dars nomi...'
    if (currentLesson && userLessonsData[currentLesson]) selectLesson(currentLesson)
    else updateCard()
  } else {
    vocabTab.classList.remove('active')
    speakingTab.classList.add('active')
    vocabContent.style.display = 'none'
    speakingContent.style.display = 'flex'
    sidebarTitle.textContent = 'Speaking Mavzulari'
    inputPlaceholder.placeholder = 'Yangi mavzu nomi...'
    if (currentTopic && userSpeakingData[currentTopic]) selectSpeakingTopic(currentTopic)
    else renderSpeakingQA()
  }
  renderSidebar()
}

function renderSidebar() {
  const listContainer = document.getElementById('lesson-list')
  listContainer.innerHTML = ''
  const targetData = currentSection === 'vocab' ? userLessonsData : userSpeakingData
  const activeItem = currentSection === 'vocab' ? currentLesson : currentTopic

  Object.keys(targetData).forEach((name) => {
    const item = document.createElement('div')
    item.className = `lesson-item ${name === activeItem ? 'active' : ''}`
    item.onclick = () =>
      currentSection === 'vocab' ? selectLesson(name) : selectSpeakingTopic(name)

    const textSpan = document.createElement('span')
    textSpan.className = 'lesson-text'
    textSpan.textContent = name
    item.appendChild(textSpan)

    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'lesson-actions'

    const editBtn = document.createElement('button')
    editBtn.className = 'lesson-btn'
    editBtn.innerHTML = '✏️'
    editBtn.onclick = (e) => editSidebarItemName(e, name)
    actionsDiv.appendChild(editBtn)

    const delBtn = document.createElement('button')
    delBtn.className = 'lesson-btn delete'
    delBtn.innerHTML = '🗑️'
    delBtn.onclick = (e) => deleteSidebarItem(e, name)
    actionsDiv.appendChild(delBtn)

    item.appendChild(actionsDiv)
    listContainer.appendChild(item)
  })
}

function addNewSidebarItem() {
  const input = document.getElementById('new-lesson-input')
  const name = escapeHTML(input.value.trim())
  if (!name) return

  if (currentSection === 'vocab') {
    if (userLessonsData[name]) return alert('Bunday dars allaqachon bor!')
    userLessonsData[name] = []
    currentLesson = name
    saveUserDataToDB()
    selectLesson(name)
  } else {
    if (userSpeakingData[name]) return alert('Bunday mavzu allaqachon bor!')
    userSpeakingData[name] = []
    currentTopic = name
    saveUserDataToDB()
    selectSpeakingTopic(name)
  }
  input.value = ''
}

function editSidebarItemName(event, oldName) {
  event.stopPropagation()
  const newName = prompt(`Yangi nom kiriting:`, oldName)
  if (!newName || newName.trim() === oldName) return
  const cleanName = escapeHTML(newName.trim())

  if (currentSection === 'vocab') {
    if (userLessonsData[cleanName]) return alert('Bu nom band!')
    userLessonsData[cleanName] = userLessonsData[oldName]
    delete userLessonsData[oldName]
    if (currentLesson === oldName) currentLesson = cleanName
    saveUserDataToDB()
    selectLesson(currentLesson)
  } else {
    if (userSpeakingData[cleanName]) return alert('Bu nom band!')
    userSpeakingData[cleanName] = userSpeakingData[oldName]
    delete userSpeakingData[oldName]
    if (currentTopic === oldName) currentTopic = cleanName
    saveUserDataToDB()
    selectSpeakingTopic(currentTopic)
  }
}

function deleteSidebarItem(event, name) {
  event.stopPropagation()
  if (!confirm(`"${name}" o'chirishga rozimisiz?`)) return

  if (currentSection === 'vocab') {
    delete userLessonsData[name]
    currentLesson = Object.keys(userLessonsData)[0] || ''
    saveUserDataToDB()
    if (currentLesson) selectLesson(currentLesson)
    else {
      cardsList = []
      updateCard()
      renderSidebar()
    }
  } else {
    delete userSpeakingData[name]
    currentTopic = Object.keys(userSpeakingData)[0] || ''
    saveUserDataToDB()
    if (currentTopic) selectSpeakingTopic(currentTopic)
    else {
      renderSpeakingQA()
      renderSidebar()
    }
  }
}

function selectLesson(lessonName) {
  currentLesson = lessonName
  localStorage.setItem(`last_lesson_${currentActiveUser}`, lessonName)
  document.getElementById('current-lesson-title').textContent = lessonName
  cardsList = [...userLessonsData[lessonName]]
  currentIndex = 0
  renderSidebar()
  if (isListView) renderWordsList()
  else updateCard()
}

function addNewWord() {
  if (!currentLesson) return alert('Avval dars yarating!')
  const enInput = document.getElementById('new-en-input')
  const uzInput = document.getElementById('new-uz-input')
  if (!enInput.value.trim() || !uzInput.value.trim()) return alert("Maydonlarni to'ldiring!")

  const newPair = { en: escapeHTML(enInput.value.trim()), uz: escapeHTML(uzInput.value.trim()) }
  userLessonsData[currentLesson].push(newPair)
  saveUserDataToDB()

  cardsList.push(newPair)
  if (isListView) renderWordsList()
  else currentIndex = cardsList.length - 1
  enInput.value = ''
  uzInput.value = ''
  updateCard()
}

function renderWordsList() {
  const tbody = document.getElementById('words-table-body')
  tbody.innerHTML = ''
  if (cardsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">Bu dars hali bo'sh.</td></tr>`
    return
  }
  cardsList.forEach((word, index) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${index + 1}</td><td>${word.en}</td><td>${word.uz}</td>
            <td><div class="lesson-actions">
                <button class="lesson-btn" onclick="editWord(${index})">✏️</button>
                <button class="lesson-btn delete" onclick="deleteWord(${index})">🗑️</button>
            </div></td>`
    tbody.appendChild(tr)
  })
}

function editWord(index) {
  const old = cardsList[index]
  const en = prompt('English:', old.en)
  if (en === null) return
  const uz = prompt('Uzbek:', old.uz)
  if (uz === null) return
  cardsList[index] = { en: escapeHTML(en.trim()), uz: escapeHTML(uz.trim()) }
  userLessonsData[currentLesson] = [...cardsList]
  saveUserDataToDB()
  renderWordsList()
  updateCard()
}

function deleteWord(index) {
  if (!confirm("O'chirilsinmi?")) return
  cardsList.splice(index, 1)
  userLessonsData[currentLesson] = [...cardsList]
  saveUserDataToDB()
  if (currentIndex >= cardsList.length && currentIndex > 0) currentIndex--
  renderWordsList()
  updateCard()
}

function toggleListView() {
  isListView = !isListView
  document.getElementById('card-area').style.display = isListView ? 'none' : 'block'
  document.getElementById('controls-area').style.display = isListView ? 'none' : 'flex'
  document.getElementById('words-list-area').style.display = isListView ? 'block' : 'none'
  document.getElementById('view-list-btn').textContent = isListView
    ? '🎴 Karta Rejimi'
    : "📋 So'zlarni Ko'rish"
  if (isListView) renderWordsList()
  else updateCard()
}

function updateCard() {
  if (isListView || currentSection !== 'vocab') return
  const card = document.getElementById('card')
  card.classList.remove('flipped')
  setTimeout(() => {
    if (cardsList.length === 0) {
      document.getElementById('word-front').textContent = "So'zlar yo'q"
      document.getElementById('word-back').textContent = "Dars bo'sh"
      document.getElementById('progress').textContent = '0 / 0'
      return
    }
    const currentWord = cardsList[currentIndex]
    document.getElementById('word-front').textContent = isEnToUz ? currentWord.en : currentWord.uz
    document.getElementById('word-back').textContent = isEnToUz ? currentWord.uz : currentWord.en
    document.getElementById('progress').textContent = `${currentIndex + 1} / ${cardsList.length}`
  }, 150)
}

function flipCard() {
  if (!isListView && cardsList.length > 0)
    document.getElementById('card').classList.toggle('flipped')
}
function nextCard() {
  if (currentIndex < cardsList.length - 1) {
    currentIndex++
    updateCard()
  }
}
function prevCard() {
  if (currentIndex > 0) {
    currentIndex--
    updateCard()
  }
}
function shuffleCards() {
  cardsList.sort(() => Math.random() - 0.5)
  currentIndex = 0
  updateCard()
}
function toggleMode() {
  isEnToUz = !isEnToUz
  document.getElementById('mode-btn').textContent = isEnToUz ? 'Rejim: EN ➔ UZ' : 'Rejim: UZ ➔ EN'
  updateCard()
}

function selectSpeakingTopic(topicName) {
  currentTopic = topicName
  localStorage.setItem(`last_topic_${currentActiveUser}`, topicName)
  document.getElementById('current-topic-title').textContent = topicName
  renderSidebar()
  renderSpeakingQA()
}

function addNewSpeakingQA() {
  if (!currentTopic) return alert('Iltimos, avval biror mavzu tanlang yoki yarating!')
  const qInput = document.getElementById('new-question-input')
  const aInput = document.getElementById('new-answer-input')
  if (!qInput.value.trim() || !aInput.value.trim())
    return alert("Savol va javobni to'liq kiriting!")

  userSpeakingData[currentTopic].push({
    q: escapeHTML(qInput.value.trim()),
    a: escapeHTML(aInput.value.trim()),
  })

  saveUserDataToDB()
  qInput.value = ''
  aInput.value = ''
  renderSpeakingQA()
}

function renderSpeakingQA() {
  const listDiv = document.getElementById('speaking-qa-list')
  const countText = document.getElementById('speaking-count')
  listDiv.innerHTML = ''

  if (
    !currentTopic ||
    !userSpeakingData[currentTopic] ||
    userSpeakingData[currentTopic].length === 0
  ) {
    listDiv.innerHTML = `<div style="text-align:center; color:#666; margin-top:20px;">Bu mavzuda savollar kiritilmagan.</div>`
    countText.textContent = 'Savollar soni: 0'
    if (!currentTopic)
      document.getElementById('current-topic-title').textContent = 'Mavzu tanlanmagan'
    return
  }

  const qaList = userSpeakingData[currentTopic]
  countText.textContent = `Savollar soni: ${qaList.length}`

  qaList.forEach((item, index) => {
    const qaBox = document.createElement('div')
    qaBox.className = 'speaking-item'
    qaBox.id = `speaking-item-${index}`

    qaBox.innerHTML = `
            <div class="speaking-q" id="q-text-${index}">Q${index + 1}: ${item.q}</div>
            <div class="speaking-a" id="a-text-${index}">${item.a}</div>
            <div class="item-actions" id="actions-${index}">
                <button class="lesson-btn" onclick="enableInlineEdit(${index})" title="Tahrirlash">✏️</button>
                <button class="lesson-btn delete" onclick="deleteSpeakingQA(${index})" title="O'chirish">🗑️</button>
            </div>
        `
    listDiv.appendChild(qaBox)
  })
}

function enableInlineEdit(index) {
  const item = userSpeakingData[currentTopic][index]
  const qDiv = document.getElementById(`q-text-${index}`)
  const aDiv = document.getElementById(`a-text-${index}`)
  const actionsDiv = document.getElementById(`actions-${index}`)

  qDiv.innerHTML = `<input type="text" id="edit-q-input-${index}" class="inline-edit-input" value="${item.q}">`
  aDiv.innerHTML = `<textarea id="edit-a-input-${index}" class="inline-edit-textarea" rows="5">${item.a}</textarea>`

  actionsDiv.innerHTML = `
        <button class="lesson-btn save-inline-btn" onclick="saveInlineEdit(${index})">💾 Saqlash</button>
        <button class="lesson-btn" onclick="renderSpeakingQA()">❌</button>
    `
}

function saveInlineEdit(index) {
  const newQ = document.getElementById(`edit-q-input-${index}`).value.trim()
  const newA = document.getElementById(`edit-a-input-${index}`).value.trim()
  if (!newQ || !newA) return alert("Bo'sh qoldirish mumkin emas!")

  userSpeakingData[currentTopic][index] = { q: escapeHTML(newQ), a: escapeHTML(newA) }
  saveUserDataToDB()
  renderSpeakingQA()
}

function deleteSpeakingQA(index) {
  if (!confirm("Ushbu savol-javobni o'chirishni xohlaysizmi?")) return
  userSpeakingData[currentTopic].splice(index, 1)
  saveUserDataToDB()
  renderSpeakingQA()
}

function resetAllData() {
  if (confirm('Ushbu profildagi barcha shaxsiy darslarni tozalashni xohlaysizmi?')) {
    userLessonsData = {}
    saveUserDataToDB()
    renderSidebar()
    updateCard()
  }
}

// XAVFSIZLIK: Barcha foydalanuvchilar va ularning ma'lumotlarini JSON fayl qilib yuklab olish (Backup)
function exportUserData() {
  const backupObj = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    backupObj[key] = localStorage.getItem(key)
  }

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', dataStr)
  downloadAnchor.setAttribute(
    'download',
    `vocabulary_app_backup_${currentActiveUser || 'guest'}.json`
  )
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

// XAVFSIZLIK: JSON fayldan ma'lumotlarni xatolarsiz tekshirib qayta tiklash (Restore)
function importUserData(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result)
      if (typeof importedData !== 'object') throw new Error()

      for (const key in importedData) {
        localStorage.setItem(key, importedData[key])
      }
      alert("Barcha ma'lumotlar xavfsiz tiklandi! Platforma qayta yuklanadi.")
      location.reload()
    } catch (err) {
      alert('Xatolik: Yuklangan fayl yaroqli JSON zaxira fayli emas!')
    }
  }
  reader.readAsText(file)
  event.target.value = '' // Inputni tozalash
}

document.addEventListener('keydown', (e) => {
  if (document.getElementById('auth-screen').style.display !== 'none') {
    if (e.key === 'Enter') handleAuth()
    return
  }
  if (currentSection !== 'vocab' || isListView) return
  const activeEl = document.activeElement.tagName
  if (activeEl === 'INPUT' || activeEl === 'TEXTAREA') return

  if (e.key === ' ' || e.key === 'Enter') flipCard()
  else if (e.key === 'ArrowRight') nextCard()
  else if (e.key === 'ArrowLeft') prevCard()
})

checkAuthStatus()
