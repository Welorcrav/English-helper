// 1. STANDART MA'LUMOTLAR - BUTUNLAY BO'SH HOLATGA KELTIRILDI
const defaultVocabData = {}
const defaultSpeakingData = {}

// GLOBAL LOYIHA O'ZGARUVCHILARI
let userLessonsData = {}
let userSpeakingData = {}
let currentActiveUser = null
let currentSection = 'lugat' // "lugat" yoki "speaking"
let currentLesson = ''
let currentTopic = ''
let currentIndex = 0
let isEnToUz = true
let isCardFlipped = false
let isLoginMode = true

// Firebase metodlariga oson ulanish uchun yordamchi funksiya
const getFB = () => window.fbMethods

// DOM YUKLANGANDA ISHGA TUSHADIGAN ASOSIY FUNKSIYA
document.addEventListener('DOMContentLoaded', () => {
  initDOMEvents()
  checkAuthStatus()
})

// SAHIFA YUKLANGANDA STATUSNI VA FOYDALANUVCHINI TEKSHIRISH
function checkAuthStatus() {
  if (!window.auth) {
    console.error('Firebase Auth moduli topilmadi! index.html faylini tekshiring.')
    return
  }

  window.auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentActiveUser = user.email.split('@')[0]
      document.getElementById('user-display-name').textContent = currentActiveUser

      document.getElementById('auth-screen').style.display = 'none'
      document.getElementById('app-screen').style.display = 'flex'

      // Onlayn bazadan ma'lumotlarni yuklab olish
      await loadUserSessionFromFirebase(user.uid)
    } else {
      showAuthScreen()
    }
  })
}

// FIRESTORE'DAN MA'LUMOTLARNI YUKLASH
async function loadUserSessionFromFirebase(uid) {
  const { doc, getDoc } = getFB()
  const docRef = doc(window.db, 'users', uid)

  try {
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const userData = docSnap.data()
      userLessonsData = userData.lessons || {}
      userSpeakingData = userData.speaking || {}
    } else {
      // Yangi profil ochilganda mutlaqo bo'sh darsliklar beriladi
      userLessonsData = {}
      userSpeakingData = {}
      await saveUserDataToDB()
    }

    currentLesson = Object.keys(userLessonsData)[0] || ''
    currentTopic = Object.keys(userSpeakingData)[0] || ''
    currentIndex = 0

    renderSidebar()
    switchSection(currentSection)
  } catch (e) {
    console.error('Yuklashda xatolik yuz berdi:', e)
  }
}

// FIRESTORE'GA MA'LUMOTLARNI AVTOMATIK SAQLASH
async function saveUserDataToDB() {
  const user = window.auth.currentUser
  if (!user) return

  const { doc, setDoc } = getFB()
  try {
    await setDoc(
      doc(window.db, 'users', user.uid),
      {
        lessons: userLessonsData,
        speaking: userSpeakingData,
      },
      { merge: true }
    )
  } catch (e) {
    console.error('Bazaga yozishda xatolik yuz berdi:', e)
  }
}

// RO'YXATDAN O'TISH VA TIZIMGA KIRISH (YANGILANGAN ERROR-HANDLING BILAN)
async function handleAuth() {
  const usernameInput = document.getElementById('auth-username').value.trim()
  const passwordInput = document.getElementById('auth-password').value.trim()

  if (!usernameInput || !passwordInput) {
    alert("Iltimos, barcha maydonlarni to'ldiring!")
    return
  }

  const userEmail = `${usernameInput}@memorizerapp.com`
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc } = getFB()

  try {
    if (isLoginMode) {
      await signInWithEmailAndPassword(window.auth, userEmail, passwordInput)
    } else {
      const userCredential = await createUserWithEmailAndPassword(
        window.auth,
        userEmail,
        passwordInput
      )

      // Yangi foydalanuvchiga bo'sh joy ochiladi
      await setDoc(doc(window.db, 'users', userCredential.user.uid), {
        lessons: {},
        speaking: {},
      })

      alert('Profil muvaffaqiyatli yaratildi! Tizimga avtomatik kiriladi.')
    }
  } catch (error) {
    console.error('Firebase Auth Error Code:', error.code) // Konsolda aniq kodni ko'rish uchun

    let errorMsg = 'Xatolik yuz berdi.'

    // Firebase yangi va eski xatolik kodlarini tekshirish
    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential'
    ) {
      errorMsg = "Foydalanuvchi nomi yoki parol noto'g'ri!"
    } else if (error.code === 'auth/email-already-in-use') {
      errorMsg = 'Bu foydalanuvchi nomi band!'
    } else if (error.code === 'auth/weak-password') {
      errorMsg = "Parol juda oddiy (kamida 6 ta belgi bo'lishi kerak)!"
    } else if (error.code === 'auth/invalid-email') {
      errorMsg = 'Foydalanuvchi nomida taqiqlangan belgilardan foydalanilgan!'
    }

    alert(errorMsg)
  }
}

// PROFILIDAN CHIQISH
async function logout() {
  if (confirm('Haqiqatan ham profilingizdan chiqmoqchimisiz?')) {
    const { signOut } = getFB()
    await signOut(window.auth)
    currentActiveUser = null
    showAuthScreen()
  }
}

function showAuthScreen() {
  document.getElementById('app-screen').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'flex'
}

// INTERFEYS ELEMENTLARINI BOSHQARISH
function switchSection(section) {
  currentSection = section
  currentIndex = 0
  isCardFlipped = false

  const lugatBtn = document.getElementById('tab-vocab')
  const speakingBtn = document.getElementById('tab-speaking')
  const lugatContent = document.getElementById('vocab-section-content')
  const speakingContent = document.getElementById('speaking-section-content')
  const sidebarTitle = document.getElementById('sidebar-title')
  const addInput = document.getElementById('new-item-name')

  if (section === 'lugat') {
    lugatBtn.classList.add('active')
    speakingBtn.classList.remove('active')
    lugatContent.style.display = 'block'
    speakingContent.style.display = 'none'
    sidebarTitle.textContent = 'Darslar'
    addInput.placeholder = 'Yangi dars nomi...'
  } else {
    speakingBtn.classList.add('active')
    lugatBtn.classList.remove('active')
    speakingContent.style.display = 'block'
    lugatContent.style.display = 'none'
    sidebarTitle.textContent = 'Mavzular'
    addInput.placeholder = 'Yangi mavzu nomi...'
  }

  renderSidebar()
  updateCardUI()
}

function renderSidebar() {
  const listContainer = document.getElementById('sidebar-items-list')
  listContainer.innerHTML = ''

  const dataObj = currentSection === 'lugat' ? userLessonsData : userSpeakingData
  const activeKey = currentSection === 'lugat' ? currentLesson : currentTopic

  Object.keys(dataObj).forEach((key) => {
    const itemDiv = document.createElement('div')
    itemDiv.className = `sidebar-item ${key === activeKey ? 'active' : ''}`
    itemDiv.onclick = () => {
      if (currentSection === 'lugat') currentLesson = key
      else currentTopic = key
      currentIndex = 0
      isCardFlipped = false
      renderSidebar()
      updateCardUI()
    }

    const nameSpan = document.createElement('span')
    nameSpan.textContent = key

    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'item-actions'

    const editBtn = document.createElement('button')
    editBtn.innerHTML = '✏️'
    editBtn.onclick = (e) => {
      e.stopPropagation()
      renameItem(key)
    }

    const delBtn = document.createElement('button')
    delBtn.innerHTML = '🗑️'
    delBtn.onclick = (e) => {
      e.stopPropagation()
      deleteItem(key)
    }

    actionsDiv.appendChild(editBtn)
    actionsDiv.appendChild(delBtn)
    itemDiv.appendChild(nameSpan)
    itemDiv.appendChild(actionsDiv)
    listContainer.appendChild(itemDiv)
  })
}

function updateCardUI() {
  isCardFlipped = false
  if (currentSection === 'lugat') {
    const words = userLessonsData[currentLesson] || []
    document.getElementById('current-lesson-title').textContent =
      currentLesson || 'Dars tanlanmagan'
    document.getElementById('progress').textContent =
      words.length > 0 ? `${currentIndex + 1} / ${words.length}` : '0 / 0'

    const wordText = document.getElementById('card-word-text')
    const subText = document.getElementById('card-sub-text')

    if (words.length > 0) {
      const currentWord = words[currentIndex]
      wordText.textContent = isEnToUz ? currentWord.en : currentWord.uz
      subText.textContent = "Tarjamasini ko'rish uchun bosing"
    } else {
      wordText.textContent = "Lug'at bo'sh"
      subText.textContent = "Yangi so'z qo'shing"
    }
  } else {
    const topics = userSpeakingData[currentTopic] || []
    const container = document.getElementById('speaking-cards-container')
    container.innerHTML = ''

    if (topics.length > 0) {
      topics.forEach((item, index) => {
        const topicCard = document.createElement('div')
        topicCard.className = 'speaking-card'
        topicCard.innerHTML = `
                    <div class="speaking-header">
                        <h3>${item.question}</h3>
                        <div class="speaking-actions">
                            <button onclick="editSpeaking(${index})">✏️</button>
                            <button onclick="deleteSpeaking(${index})">🗑️</button>
                        </div>
                    </div>
                    <div class="speaking-body">
                        <p>${item.answer.replace(/\n/g, '<br>')}</p>
                    </div>
                `
        container.appendChild(topicCard)
      })
    } else {
      container.innerHTML = "<div class='empty-msg'>Bu mavzuda hozircha savollar yo'q.</div>"
    }
  }
}

function handleCardClick() {
  if (currentSection !== 'lugat') return
  const words = userLessonsData[currentLesson] || []
  if (words.length === 0) return

  const wordText = document.getElementById('card-word-text')
  const subText = document.getElementById('card-sub-text')
  const currentWord = words[currentIndex]

  isCardFlipped = !isCardFlipped
  if (isCardFlipped) {
    wordText.textContent = isEnToUz ? currentWord.uz : currentWord.en
    subText.textContent = 'Asl holatiga qaytarish uchun bosing'
  } else {
    wordText.textContent = isEnToUz ? currentWord.en : currentWord.uz
    subText.textContent = "Tarjamasini ko'rish uchun bosing"
  }
}

function handleNext() {
  const words = userLessonsData[currentLesson] || []
  if (words.length <= 1) return
  currentIndex = (currentIndex + 1) % words.length
  updateCardUI()
}

function handlePrev() {
  const words = userLessonsData[currentLesson] || []
  if (words.length <= 1) return
  currentIndex = (currentIndex - 1 + words.length) % words.length
  updateCardUI()
}

function handleShuffle() {
  const words = userLessonsData[currentLesson] || []
  if (words.length <= 1) return
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[words[i], words[j]] = [words[j], words[i]]
  }
  currentIndex = 0
  saveUserDataToDB()
  updateCardUI()
}

function toggleMode() {
  isEnToUz = !isEnToUz
  document.getElementById('mode-toggle-btn').textContent = isEnToUz
    ? 'Rejim: EN ➔ UZ'
    : 'Rejim: UZ ➔ EN'
  updateCardUI()
}

async function handleAddNewSidebarItem() {
  const input = document.getElementById('new-item-name')
  const val = input.value.trim()
  if (!val) return

  if (currentSection === 'lugat') {
    if (userLessonsData[val]) {
      alert('Bu dars allaqachon mavjud!')
      return
    }
    userLessonsData[val] = []
    currentLesson = val
  } else {
    if (userSpeakingData[val]) {
      alert('Bu mavzu allaqachon mavjud!')
      return
    }
    userSpeakingData[val] = []
    currentTopic = val
  }
  input.value = ''
  await saveUserDataToDB()
  renderSidebar()
  updateCardUI()
}

async function renameItem(oldKey) {
  const newKey = prompt('Yangi nomni kiriting:', oldKey)
  if (!newKey || newKey.trim() === '' || newKey === oldKey) return

  if (currentSection === 'lugat') {
    userLessonsData[newKey] = userLessonsData[oldKey]
    delete userLessonsData[oldKey]
    if (currentLesson === oldKey) currentLesson = newKey
  } else {
    userSpeakingData[newKey] = userSpeakingData[oldKey]
    delete userSpeakingData[oldKey]
    if (currentTopic === oldKey) currentTopic = newKey
  }
  await saveUserDataToDB()
  renderSidebar()
  updateCardUI()
}

async function deleteItem(key) {
  if (!confirm(`Haqiqatan ham "${key}" ni butunlay o'chirmoqchimisiz?`)) return
  if (currentSection === 'lugat') {
    delete userLessonsData[key]
    if (currentLesson === key) currentLesson = Object.keys(userLessonsData)[0] || ''
  } else {
    delete userSpeakingData[key]
    if (currentTopic === key) currentTopic = Object.keys(userSpeakingData)[0] || ''
  }
  currentIndex = 0
  await saveUserDataToDB()
  renderSidebar()
  updateCardUI()
}

async function handleAddWord() {
  const enInp = document.getElementById('new-word-en')
  const uzInp = document.getElementById('new-word-uz')
  if (!currentLesson) {
    alert('Iltimos, oldin dars yarating!')
    return
  }
  if (!enInp.value.trim() || !uzInp.value.trim()) {
    alert("Maydonlarni to'ldiring!")
    return
  }

  userLessonsData[currentLesson].push({ en: enInp.value.trim(), uz: uzInp.value.trim() })
  enInp.value = ''
  uzInp.value = ''
  currentIndex = userLessonsData[currentLesson].length - 1
  await saveUserDataToDB()
  updateCardUI()
}

async function handleAddSpeaking() {
  const qInp = document.getElementById('new-speak-q')
  const aInp = document.getElementById('new-speak-a')
  if (!currentTopic) {
    alert('Iltimos, mavzu tanlang!')
    return
  }
  if (!qInp.value.trim() || !aInp.value.trim()) {
    alert("Savol va javobni to'ldiring!")
    return
  }

  userSpeakingData[currentTopic].push({ question: qInp.value.trim(), answer: aInp.value.trim() })
  qInp.value = ''
  aInp.value = ''
  await saveUserDataToDB()
  updateCardUI()
}

window.editSpeaking = async function (index) {
  const item = userSpeakingData[currentTopic][index]
  const newQ = prompt('Savolni tahrirlash:', item.question)
  const newA = prompt('Javobni tahrirlash:', item.answer)
  if (newQ !== null && newA !== null) {
    userSpeakingData[currentTopic][index] = { question: newQ.trim(), answer: newA.trim() }
    await saveUserDataToDB()
    updateCardUI()
  }
}

window.deleteSpeaking = async function (index) {
  if (confirm("Ushbu savol-javobni o'chirishni xohlaysizmi?")) {
    userSpeakingData[currentTopic].splice(index, 1)
    await saveUserDataToDB()
    updateCardUI()
  }
}

function openWordsModal() {
  const words = userLessonsData[currentLesson] || []
  if (words.length === 0) {
    alert("Bu darsda hali so'zlar mavjud emas!")
    return
  }
  let listStr = words.map((w, i) => `${i + 1}. ${w.en} - ${w.uz}`).join('\n')
  alert(`"${currentLesson}" darsidagi barcha so'zlar:\n\n${listStr}`)
}

async function clearCurrentLessonWords() {
  if (!currentLesson) return
  if (confirm(`"${currentLesson}" darsidagi barcha so'zlarni tozalashni xohlaysizmi?`)) {
    userLessonsData[currentLesson] = []
    currentIndex = 0
    await saveUserDataToDB()
    updateCardUI()
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('auth-password')
  const toggleBtn = document.getElementById('toggle-password-eye')
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text'
    toggleBtn.textContent = '🙈'
  } else {
    passwordInput.type = 'password'
    toggleBtn.textContent = '👁️'
  }
}

function initDOMEvents() {
  const toggleLink = document.getElementById('auth-toggle-link')
  const authTitle = document.getElementById('auth-title')
  const authSubmitBtn = document.getElementById('auth-main-btn')
  const authToggleText = document.getElementById('auth-toggle-text')

  if (toggleLink) {
    toggleLink.onclick = (e) => {
      e.preventDefault()
      isLoginMode = !isLoginMode
      if (isLoginMode) {
        authTitle.textContent = 'Tizimga Kirish'
        authSubmitBtn.textContent = 'Kirish'
        authToggleText.textContent = "Akkauntingiz yo'qmi?"
        toggleLink.textContent = "Ro'yxatdan o'tish"
      } else {
        authTitle.textContent = "Ro'yxatdan O'tish"
        authSubmitBtn.textContent = "Ro'yxatdan O'tish"
        authToggleText.textContent = 'Akkauntingiz bormi?'
        toggleLink.textContent = 'Tizimga kirish'
      }
    }
  }

  document.getElementById('auth-main-btn').onclick = handleAuth
  document.getElementById('logout-btn').onclick = logout
  document.getElementById('tab-vocab').onclick = () => switchSection('lugat')
  document.getElementById('tab-speaking').onclick = () => switchSection('speaking')
  document.getElementById('sidebar-add-btn').onclick = handleAddNewSidebarItem
  document.getElementById('add-word-btn').onclick = handleAddWord
  document.getElementById('mode-toggle-btn').onclick = toggleMode
  document.getElementById('view-words-btn').onclick = openWordsModal
  document.getElementById('clear-words-btn').onclick = clearCurrentLessonWords
  document.getElementById('main-flashcard').onclick = handleCardClick
  document.getElementById('btn-prev').onclick = handlePrev
  document.getElementById('btn-shuffle').onclick = handleShuffle
  document.getElementById('btn-next').onclick = handleNext
  document.getElementById('add-speaking-btn').onclick = handleAddSpeaking
}
