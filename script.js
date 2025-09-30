let vocabulary = [];
let synonyms = [];
let dataLoaded = false;
let currentTestMode = null;
let currentQuestion = 0;
let score = 0;
let questions = [];
let userAnswers = [];

async function loadData() {
    try {
        const [vocabResponse, synonymResponse] = await Promise.all([
            fetch('./vocabulary.json'),
            fetch('./synonym.json')
        ]);

        if (!vocabResponse.ok || !synonymResponse.ok) {
            throw new Error('Failed to load data files');
        }

        vocabulary = await vocabResponse.json();
        synonyms = await synonymResponse.json();
        dataLoaded = true;

        console.log(`โหลดคำศัพท์สำเร็จ: ${vocabulary.length} คำ`);
        console.log(`โหลด Synonym สำเร็จ: ${synonyms.length} กลุ่ม`);

    } catch (error) {
        console.error('Error loading data:', error);
        alert('ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบไฟล์ JSON');
    }
}

function checkDataLoaded() {
    if (!dataLoaded) {
        alert('กำลังโหลดข้อมูล กรุณารอสักครู่');
        return false;
    }
    return true;
}

function showSection(sectionName) {
    if ((sectionName === 'vocabulary' || sectionName === 'synonym' || sectionName === 'test') && !checkDataLoaded()) {
        return;
    }

    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    updateNavigation(sectionName);

    switch (sectionName) {
        case 'vocabulary':
            loadVocabularyTable();
            break;
        case 'synonym':
            loadSynonymTable();
            break;
        case 'test':
            resetTestInterface();
            break;
    }
}

function updateNavigation(activeSection) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[onclick="showSection('${activeSection}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function loadVocabularyTable() {
    if (!checkDataLoaded()) return;

    const section = document.getElementById('vocabulary');
    if (!section) return;

    const oldGrid = section.querySelector('.vocab-grid');
    if (oldGrid) oldGrid.remove();

    const sortedVocabulary = [...vocabulary].sort((a, b) =>
        a.eng.toLowerCase().localeCompare(b.eng.toLowerCase())
    );

    const vocabGrid = document.createElement('div');
    vocabGrid.className = 'vocab-grid';

    const midPoint = Math.ceil(sortedVocabulary.length / 2);
    const leftColumn = sortedVocabulary.slice(0, midPoint);
    const rightColumn = sortedVocabulary.slice(midPoint);

    const leftDiv = document.createElement('div');
    leftDiv.className = 'vocab-column';

    leftColumn.forEach((item) => {
        const vocabItem = document.createElement('div');
        vocabItem.className = 'vocab-item';
        const partOfSpeech = Array.isArray(item.part) ? item.part.join(', ') : item.part;
        vocabItem.innerHTML = `
            <span class="vocab-eng">${item.eng}</span>
            <span class="vocab-part">(${partOfSpeech})</span>
            <span class="vocab-thai">${item.thai}</span>
        `;
        leftDiv.appendChild(vocabItem);
    });

    const rightDiv = document.createElement('div');
    rightDiv.className = 'vocab-column';

    rightColumn.forEach((item) => {
        const vocabItem = document.createElement('div');
        vocabItem.className = 'vocab-item';
        const partOfSpeech = Array.isArray(item.part) ? item.part.join(', ') : item.part;
        vocabItem.innerHTML = `
            <span class="vocab-eng">${item.eng}</span>
            <span class="vocab-part">(${partOfSpeech})</span>
            <span class="vocab-thai">${item.thai}</span>
        `;
        rightDiv.appendChild(vocabItem);
    });

    vocabGrid.appendChild(leftDiv);
    vocabGrid.appendChild(rightDiv);
    section.appendChild(vocabGrid);
}

function loadSynonymTable() {
    if (!checkDataLoaded()) return;

    const tbody = document.getElementById('synonym-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const sortedSynonyms = [...synonyms].sort((a, b) =>
        a.word.toLowerCase().localeCompare(b.word.toLowerCase())
    );

    sortedSynonyms.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.word}</strong></td>
            <td>${item.synonyms.join(', ')}</td>
        `;
        tbody.appendChild(row);
    });
}

function resetTestInterface() {
    const testInterface = document.getElementById('test-interface');
    const quizContent = document.getElementById('quiz-content');
    const flashcardContent = document.getElementById('flashcard-content');
    const matchContent = document.getElementById('match-content');
    const results = document.getElementById('results');
    const testOptions = document.querySelector('.test-options');

    if (testInterface) testInterface.classList.add('hidden');
    if (quizContent) quizContent.classList.add('hidden');
    if (flashcardContent) flashcardContent.classList.add('hidden');
    if (matchContent) matchContent.classList.add('hidden');
    if (results) results.classList.add('hidden');
    if (testOptions) testOptions.style.display = 'grid';

    currentTestMode = null;
    currentQuestion = 0;
    score = 0;
    questions = [];
    userAnswers = [];

    currentFlashcardIndex = 0;
    flashcardData = [];
    isFlipped = false;

    matchCards = [];
    selectedCards = [];
    matchedPairs = 0;
    matchScore = 0;
    matchTimer = 0;
    if (matchInterval) {
        clearInterval(matchInterval);
        matchInterval = null;
    }
}

function startTestMode(mode) {
    if (!checkDataLoaded()) return;

    currentTestMode = mode;
    const testInterface = document.getElementById('test-interface');
    const testOptions = document.querySelector('.test-options');

    if (mode === 'flashcard') {
        if (testOptions) testOptions.style.display = 'none';
        startFlashcards();
        return;
    } else if (mode === 'match-card') {
        if (testOptions) testOptions.style.display = 'none';
        startMatchGame();
        return;
    }

    if (testInterface) testInterface.classList.remove('hidden');
    if (testOptions) testOptions.style.display = 'none';
}

function backToTestSelection() {
    const testOptions = document.querySelector('.test-options');
    const testInterface = document.getElementById('test-interface');

    if (testOptions) testOptions.style.display = 'grid';
    if (testInterface) testInterface.classList.add('hidden');

    resetTestInterface();
}

function startQuiz() {
    const questionCountSelect = document.getElementById('question-count');
    const customCountInput = document.getElementById('custom-count');

    let questionCount;

    if (customCountInput && customCountInput.value && parseInt(customCountInput.value) > 0) {
        questionCount = parseInt(customCountInput.value);
        customCountInput.value = '';
    } else if (questionCountSelect) {
        const selectedValue = questionCountSelect.value;
        if (selectedValue === 'max') {
            const maxQuestions = currentTestMode === 'synonym' ? synonyms.length : vocabulary.length;
            questionCount = maxQuestions;
        } else {
            questionCount = parseInt(selectedValue);
        }
    } else {
        questionCount = 10;
    }

    const maxQuestions = currentTestMode === 'synonym' ? synonyms.length : vocabulary.length;
    questionCount = Math.min(questionCount, maxQuestions);

    generateQuestions(questionCount);

    const quizContent = document.getElementById('quiz-content');
    if (quizContent) {
        quizContent.classList.remove('hidden');
        showCurrentQuestion();
    }
}

function generateQuestions(count) {
    if (!checkDataLoaded()) return;

    questions = [];
    let sourceData = currentTestMode === 'synonym' ? synonyms : vocabulary;

    const shuffled = [...sourceData].sort(() => Math.random() - 0.5);
    const selectedData = shuffled.slice(0, count);

    selectedData.forEach(item => {
        let question, correctAnswer, options;

        if (currentTestMode === 'thai-to-eng') {
            question = item.thai;
            correctAnswer = item.eng;
            // ไม่แสดง part of speech ในตัวเลือก
            options = generateOptions(correctAnswer, vocabulary.map(v => v.eng));
        } else if (currentTestMode === 'eng-to-thai') {
            // ไม่แสดง part of speech ในคำถาม
            question = item.eng;
            correctAnswer = item.thai;
            options = generateOptions(correctAnswer, vocabulary.map(v => v.thai));
        } else if (currentTestMode === 'synonym') {
            question = item.word;
            const randomIndex = Math.floor(Math.random() * item.synonyms.length);
            correctAnswer = item.synonyms[randomIndex];
            options = generateSynonymOptions(correctAnswer, item.word, item.synonyms);
        }

        questions.push({ question, correctAnswer, options });
    });

    currentQuestion = 0;
    score = 0;
    userAnswers = [];
}

function generateOptions(correctAnswer, allOptions) {
    const options = [correctAnswer];
    const available = allOptions.filter(opt => opt !== correctAnswer);

    while (options.length < 4 && available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        options.push(available.splice(randomIndex, 1)[0]);
    }

    return options.sort(() => Math.random() - 0.5);
}

function generateSynonymOptions(correctAnswer, originalWord, allSynonymsForWord) {
    const options = [correctAnswer];

    const otherWords = synonyms
        .filter(s => s.word !== originalWord)
        .flatMap(s => s.synonyms)
        .filter(word =>
            !allSynonymsForWord.includes(word) &&
            !options.includes(word)
        );

    while (options.length < 4 && otherWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherWords.length);
        const selectedWord = otherWords.splice(randomIndex, 1)[0];
        if (!options.includes(selectedWord)) {
            options.push(selectedWord);
        }
    }

    if (options.length < 4) {
        const vocabWords = vocabulary
            .map(v => v.eng)
            .filter(word =>
                !allSynonymsForWord.includes(word) &&
                !options.includes(word) &&
                word !== originalWord
            );

        while (options.length < 4 && vocabWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * vocabWords.length);
            const selectedWord = vocabWords.splice(randomIndex, 1)[0];
            options.push(selectedWord);
        }
    }

    return options.sort(() => Math.random() - 0.5);
}

function showCurrentQuestion() {
    if (currentQuestion >= questions.length) {
        showResults();
        return;
    }

    const currentQ = questions[currentQuestion];

    const progress = document.getElementById('progress');
    if (progress) {
        progress.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    }

    const questionElement = document.getElementById('question');
    if (questionElement) {
        if (currentTestMode === 'synonym') {
            const synonymData = synonyms.find(item => item.word === currentQ.question);
            const thaiTranslation = synonymData ? synonymData.thai : '';
            questionElement.textContent = `${currentQ.question}${thaiTranslation ? ` (${thaiTranslation})` : ''}`;
        } else {
            questionElement.textContent = currentQ.question;
        }
    }

    const optionsContainer = document.getElementById('options');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        currentQ.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            button.onclick = () => selectAnswer(option);
            optionsContainer.appendChild(button);
        });
    }
}

function selectAnswer(selectedAnswer) {
    const currentQ = questions[currentQuestion];
    const isCorrect = selectedAnswer === currentQ.correctAnswer;

    userAnswers.push({
        question: currentQ.question,
        selectedAnswer: selectedAnswer,
        correctAnswer: currentQ.correctAnswer,
        isCorrect: isCorrect
    });

    if (isCorrect) {
        score++;
    }

    const optionsContainer = document.getElementById('options');
    if (optionsContainer) {
        const buttons = optionsContainer.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === currentQ.correctAnswer) {
                btn.classList.add('correct');
            } else if (btn.textContent === selectedAnswer && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });
    }

    setTimeout(() => {
        currentQuestion++;
        showCurrentQuestion();
    }, 1500);
}

function showResults() {
    const quizContent = document.getElementById('quiz-content');
    const results = document.getElementById('results');

    if (quizContent) quizContent.classList.add('hidden');
    if (results) {
        results.classList.remove('hidden');

        const percentage = Math.round((score / questions.length) * 100);
        const incorrectCount = questions.length - score;

        let resultsHTML = `
            <div class="score-container">
                <div class="score">🎯 คะแนนรวม: ${score}/${questions.length} (${percentage}%)</div>
                <div class="score" style="color: #56ab2f;">✅ ถูก: ${score} ข้อ</div>
                <div class="score" style="color: #ff4b2b;">❌ ผิด: ${incorrectCount} ข้อ</div>
            </div>
        `;

        if (incorrectCount > 0) {
            resultsHTML += '<h3>รายละเอียดข้อที่ตอบผิด:</h3>';
            resultsHTML += '<div class="result-details">';

            userAnswers.forEach((answer, index) => {
                if (!answer.isCorrect) {
                    resultsHTML += `
                        <div class="result-item">
                            <strong>ข้อ ${index + 1}:</strong> ${answer.question}<br>
                            <strong>คำตอบของคุณ:</strong> ${answer.selectedAnswer}<br>
                            <strong>คำตอบที่ถูก:</strong> ${answer.correctAnswer}
                        </div>
                    `;
                }
            });

            resultsHTML += '</div>';
        }

        resultsHTML += `
            <button class="retry-btn" onclick="restartQuiz()">ทำใหม่</button>
            <button class="retry-btn" onclick="backToTestSelection()" style="margin-left: 10px;">กลับหน้าหลัก</button>
        `;

        results.innerHTML = resultsHTML;
    }
}

function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    userAnswers = [];

    const quizContent = document.getElementById('quiz-content');
    const results = document.getElementById('results');

    if (results) results.classList.add('hidden');
    if (quizContent) {
        quizContent.classList.remove('hidden');
        showCurrentQuestion();
    }
}

function showFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    const textarea = document.getElementById('feedback-text');
    const status = document.getElementById('feedback-status');

    if (modal) modal.classList.add('hidden');
    if (textarea) textarea.value = '';
    if (status) status.innerHTML = '';
}

function submitFeedback() {
    const textarea = document.getElementById('feedback-text');
    const status = document.getElementById('feedback-status');

    if (!textarea || !status) return;

    const message = textarea.value.trim();

    if (message === '') {
        status.innerHTML = '<p style="color: #ff4b2b;">กรุณากรอกข้อความ</p>';
        return;
    }

    status.innerHTML = '<p style="color: #667eea;">กำลังส่งข้อความ...</p>';

    emailjs.send('service_z8gp3et', 'template_mvuejpc', {
        message: message,
        from_name: 'Jump Sup User',
        to_email: 'phoppisit14052551@gmail.com',
        title: 'Feedback จาก Jump Sup Website'
    })
        .then(function (response) {
            console.log('SUCCESS!', response.status, response.text);
            status.innerHTML = '<p style="color: #56ab2f;">✅ ส่งข้อความเรียบร้อยแล้ว ขอบคุณสำหรับข้อเสนอแนะ</p>';

            setTimeout(() => {
                closeFeedbackModal();
            }, 2000);
        })
        .catch(function (error) {
            console.error('FAILED...', error);
            status.innerHTML = '<p style="color: #ff4b2b;">❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>';
        });
}

document.addEventListener('DOMContentLoaded', async function () {
    loadSavedTheme();
    await loadData();
    showSection('home');

    window.addEventListener('click', function (event) {
        const modal = document.getElementById('feedback-modal');
        if (event.target === modal) {
            closeFeedbackModal();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeFeedbackModal();
        }
    });

    console.log('Jump Sup Application โหลดสำเร็จ!');
});

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');

    if (isDark) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Flashcard และ Match Card variables
let currentFlashcardIndex = 0;
let flashcardData = [];
let isFlipped = false;

let matchCards = [];
let selectedCards = [];
let matchedPairs = 0;
let matchScore = 0;
let matchTimer = 0;
let matchInterval = null;

// Flashcard Functions
function startFlashcards() {
    console.log('Starting flashcards');
    
    if (vocabulary.length === 0) {
        alert('ไม่พบข้อมูลคำศัพท์');
        return;
    }

    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    flashcardData = shuffled;

    currentFlashcardIndex = 0;
    isFlipped = false;

    const testInterface = document.getElementById('test-interface');
    const flashcardContent = document.getElementById('flashcard-content');
    
    if (testInterface) testInterface.classList.remove('hidden');
    if (flashcardContent) {
        flashcardContent.classList.remove('hidden');
        showFlashcard();
    }
}

function showFlashcard() {
    if (flashcardData.length === 0) return;

    const currentCard = flashcardData[currentFlashcardIndex];
    const flashcardEnglish = document.getElementById('flashcard-english');
    const flashcardThai = document.getElementById('flashcard-thai');
    const cardCounter = document.getElementById('card-counter');
    const flashcard = document.getElementById('flashcard');

    if (flashcardEnglish) flashcardEnglish.textContent = currentCard.eng;
    if (flashcardThai) flashcardThai.textContent = currentCard.thai;
    if (cardCounter) cardCounter.textContent = `${currentFlashcardIndex + 1} / ${flashcardData.length}`;

    if (flashcard) {
        flashcard.classList.remove('flipped');
        isFlipped = false;
    }

    updateFlashcardNavigation();
}

function flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.classList.toggle('flipped');
        isFlipped = !isFlipped;
    }
}

function nextCard() {
    if (currentFlashcardIndex < flashcardData.length - 1) {
        currentFlashcardIndex++;
        showFlashcard();
    }
}

function prevCard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        showFlashcard();
    }
}

function updateFlashcardNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (prevBtn) {
        prevBtn.disabled = currentFlashcardIndex === 0;
    }

    if (nextBtn) {
        nextBtn.disabled = currentFlashcardIndex === flashcardData.length - 1;
    }
}

function shuffleFlashcards() {
    flashcardData = [...flashcardData].sort(() => Math.random() - 0.5);
    currentFlashcardIndex = 0;
    showFlashcard();
}

// Match Card Functions
function startMatchGame() {
    console.log('Starting match game');
    
    if (vocabulary.length === 0) {
        alert('ไม่พบข้อมูลคำศัพท์');
        return;
    }

    const pairCount = 10;
    setupMatchGame(pairCount);

    const testInterface = document.getElementById('test-interface');
    const matchContent = document.getElementById('match-content');
    
    if (testInterface) testInterface.classList.remove('hidden');
    if (matchContent) {
        matchContent.classList.remove('hidden');
    }
}

function setupMatchGame(pairCount) {
    selectedCards = [];
    matchedPairs = 0;
    matchScore = 0;
    matchTimer = 0;

    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    const selectedVocab = shuffled.slice(0, pairCount);

    matchCards = [];
    selectedVocab.forEach((item, index) => {
        matchCards.push({
            id: index * 2,
            text: item.eng,
            type: 'english',
            pairId: index,
            matched: false
        });
        matchCards.push({
            id: index * 2 + 1,
            text: item.thai,
            type: 'thai',
            pairId: index,
            matched: false
        });
    });

    matchCards = matchCards.sort(() => Math.random() - 0.5);

    updateMatchScore();
    updateTotalPairs(pairCount);
    createMatchCardsGrid();
}

function createMatchCardsGrid() {
    const grid = document.getElementById('match-cards-grid');
    if (!grid) return;

    grid.innerHTML = '';

    matchCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'match-card';
        cardElement.textContent = card.text;
        cardElement.dataset.cardId = card.id;
        cardElement.onclick = () => selectMatchCard(card.id);
        grid.appendChild(cardElement);
    });
}

function selectMatchCard(cardId) {
    const card = matchCards.find(c => c.id === cardId);
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);

    if (!card || !cardElement || card.matched) return;

    if (selectedCards.includes(cardId)) {
        selectedCards = selectedCards.filter(id => id !== cardId);
        cardElement.classList.remove('selected');
        return;
    }

    if (selectedCards.length >= 2) return;

    selectedCards.push(cardId);
    cardElement.classList.add('selected');

    if (selectedCards.length === 2) {
        setTimeout(() => checkMatch(), 500);
    }
}

function checkMatch() {
    const card1 = matchCards.find(c => c.id === selectedCards[0]);
    const card2 = matchCards.find(c => c.id === selectedCards[1]);

    const card1Element = document.querySelector(`[data-card-id="${selectedCards[0]}"]`);
    const card2Element = document.querySelector(`[data-card-id="${selectedCards[1]}"]`);

    if (card1.pairId === card2.pairId) {
        card1.matched = true;
        card2.matched = true;
        matchedPairs++;
        matchScore += 10;

        card1Element.classList.remove('selected');
        card2Element.classList.remove('selected');
        card1Element.classList.add('matched');
        card2Element.classList.add('matched');

        if (matchedPairs === matchCards.length / 2) {
            setTimeout(() => showMatchResults(), 1000);
        }
    } else {
        card1Element.classList.remove('selected');
        card2Element.classList.remove('selected');
        card1Element.classList.add('wrong');
        card2Element.classList.add('wrong');

        setTimeout(() => {
            card1Element.classList.remove('wrong');
            card2Element.classList.remove('wrong');
        }, 500);

        matchScore = Math.max(0, matchScore - 2);
    }

    selectedCards = [];
    updateMatchScore();
    updateMatchedPairs();
}

function updateMatchScore() {
    const scoreElement = document.getElementById('match-score');
    if (scoreElement) {
        scoreElement.textContent = matchScore;
    }
}

function updateMatchedPairs() {
    const pairsElement = document.getElementById('matched-pairs');
    if (pairsElement) {
        pairsElement.textContent = matchedPairs;
    }
}

function updateTotalPairs(total) {
    const totalElement = document.getElementById('total-pairs');
    if (totalElement) {
        totalElement.textContent = total;
    }
}

function showMatchResults() {
    const results = document.getElementById('results');
    const matchContent = document.getElementById('match-content');

    if (matchContent) matchContent.classList.add('hidden');
    if (results) {
        results.classList.remove('hidden');

        let resultsHTML = `
            <div class="score-container">
                <div class="score">🎯 คะแนนรวม: ${matchScore} คะแนน</div>
                <div class="score" style="color: #56ab2f;">✅ จับคู่ได้: ${matchedPairs} คู่</div>
            </div>
        `;

        resultsHTML += '<h3>สรุปผลการจับคู่:</h3>';
        resultsHTML += '<div class="result-details">';

        const uniquePairs = {};
        matchCards.forEach(card => {
            if (!uniquePairs[card.pairId]) {
                const pairCards = matchCards.filter(c => c.pairId === card.pairId);
                const engCard = pairCards.find(c => c.type === 'english');
                const thaiCard = pairCards.find(c => c.type === 'thai');

                uniquePairs[card.pairId] = {
                    english: engCard.text,
                    thai: thaiCard.text,
                    matched: card.matched
                };
            }
        });

        Object.values(uniquePairs).forEach((pair, index) => {
            const status = pair.matched ? '✅' : '❌';
            const statusColor = pair.matched ? '#56ab2f' : '#ff4b2b';
            resultsHTML += `
                <div class="result-item" style="border-left-color: ${statusColor};">
                    <strong>คู่ที่ ${index + 1}:</strong> ${pair.english} ↔ ${pair.thai} ${status}
                </div>
            `;
        });

        resultsHTML += '</div>';

        resultsHTML += `
            <button class="retry-btn" onclick="restartMatchGame()">เริ่มใหม่</button>
            <button class="retry-btn" onclick="backToTestSelection()" style="margin-left: 10px;">กลับหน้าหลัก</button>
        `;

        results.innerHTML = resultsHTML;
    }
}

function restartMatchGame() {
    const results = document.getElementById('results');
    const matchContent = document.getElementById('match-content');

    if (results) results.classList.add('hidden');
    if (matchContent) matchContent.classList.remove('hidden');

    const currentPairCount = matchCards.length / 2;
    setupMatchGame(currentPairCount);
}