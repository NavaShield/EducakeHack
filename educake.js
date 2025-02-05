(async function() {
    // Get the authorization token from sessionStorage
    let authToken = sessionStorage.getItem("token");

    // Function to get XSRF-TOKEN from cookies
    function getXsrfToken() {
        let match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }
    let xsrfToken = getXsrfToken();

    if (!authToken) {
        alert("Authorization token not found in sessionStorage. Ensure you're logged in.");
        return;
    }

    if (!xsrfToken) {
        alert("XSRF token not found in cookies. Ensure you're logged in.");
        return;
    }

    // Extract Quiz ID from URL
    let match = window.location.pathname.match(/quiz\/(\d+)/);
    if (!match) {
        alert("Quiz ID not found in the URL.");
        return;
    }
    let quizId = match[1];

    console.log("Quiz ID:", quizId);
    console.log("Using Auth Token:", authToken);
    console.log("Using XSRF Token:", xsrfToken);

    try {
        // Fetch quiz data
        let quizResponse = await fetch(`https://my.educake.co.uk/api/student/quiz/${quizId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;version=2',
                'Authorization': `Bearer ${authToken}`,
                'X-XSRF-TOKEN': xsrfToken
            }
        });

        if (!quizResponse.ok) throw new Error("Failed to fetch quiz data.");

        let quizData = await quizResponse.json();

        // Extract question IDs
        let questionIds = quizData.attempt[quizId].questions;
        console.log("Found Question IDs:", questionIds);

        let answers = [];

        // Fetch correct answers for each question
        for (let questionId of questionIds) {
            try {
                let response = await fetch(`https://my.educake.co.uk/api/course/question/${questionId}/mark`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json;version=2',
                        'Authorization': `Bearer ${authToken}`,
                        'X-XSRF-TOKEN': xsrfToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ "givenAnswer": "1" }) // Dummy answer to get correct answer
                });

                let data = await response.json();

                // Check if response contains the correct answer
                if (data.answer && data.answer.correctAnswers) {
                    let correctAnswer = data.answer.correctAnswers.join(", ");
                    answers.push({ questionId, correctAnswer });
                    console.log(`Question ${questionId} - Correct Answer: ${correctAnswer}`);
                } else {
                    console.log(`Question ${questionId} - No correct answer found.`);
                }
            } catch (error) {
                console.error(`Error submitting question ${questionId}:`, error);
            }
        }

        // Encode answers as Base64 JSON
        let encodedAnswers = btoa(JSON.stringify(answers));

        // Create "Show Answers" button
        let showAnswersButton = document.createElement('div');
        showAnswersButton.innerText = 'Show Answers';
        showAnswersButton.style.position = 'fixed';
        showAnswersButton.style.top = '10px';
        showAnswersButton.style.left = '10px';
        showAnswersButton.style.width = '150px';
        showAnswersButton.style.height = '150px';
        showAnswersButton.style.border = '2px solid green';
        showAnswersButton.style.borderRadius = '50%';
        showAnswersButton.style.color = 'green';
        showAnswersButton.style.display = 'flex';
        showAnswersButton.style.alignItems = 'center';
        showAnswersButton.style.justifyContent = 'center';
        showAnswersButton.style.fontWeight = 'bold';
        showAnswersButton.style.fontSize = '16px';
        showAnswersButton.style.cursor = 'pointer';
        showAnswersButton.style.zIndex = '9999';

        // Create iframe (hidden initially)
        let iframe = document.createElement('iframe');
        iframe.src = `https://educake.samj.app/?answers=${encodedAnswers}`;
        iframe.style.position = 'fixed';
        iframe.style.top = '10px';
        iframe.style.left = '10px';
        iframe.style.width = '300px';  // Portrait style (taller than wide)
        iframe.style.height = '500px'; // Portrait style (taller than wide)
        iframe.style.border = '2px solid green';
        iframe.style.borderRadius = '8px';
        iframe.style.zIndex = '9999';
        iframe.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.1)';
        iframe.style.display = 'none';  // Hidden by default

        // Add "Hide Answers" link inside iframe
        let hideAnswersLink = document.createElement('a');
        hideAnswersLink.href = '#';
        hideAnswersLink.innerText = 'Hide Answers';
        hideAnswersLink.style.position = 'absolute';
        hideAnswersLink.style.bottom = '10px';
        hideAnswersLink.style.right = '10px';
        hideAnswersLink.style.color = 'green';
        hideAnswersLink.style.textDecoration = 'underline';
        hideAnswersLink.style.fontSize = '14px';
        hideAnswersLink.addEventListener('click', () => {
            iframe.style.display = 'none';
            showAnswersButton.style.display = 'flex';  // Show the button again
        });

        iframe.appendChild(hideAnswersLink);

        // Toggle iframe visibility when button is clicked
        showAnswersButton.addEventListener('click', () => {
            iframe.style.display = 'block';
            showAnswersButton.style.display = 'none';  // Hide the button
        });

        // Add elements to the document body
        document.body.appendChild(showAnswersButton);
        document.body.appendChild(iframe);

        // Make the iframe draggable and resizable (except on mobile)
        if (window.innerWidth > 768) {
            let isDragging = false;
            let offsetX, offsetY;

            iframe.addEventListener('mousedown', (e) => {
                isDragging = true;
                offsetX = e.clientX - iframe.offsetLeft;
                offsetY = e.clientY - iframe.offsetTop;
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    iframe.style.left = `${e.clientX - offsetX}px`;
                    iframe.style.top = `${e.clientY - offsetY}px`;
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            iframe.style.resize = 'both';
            iframe.style.overflow = 'auto';
        }

        // Adjust iframe size and disable resizing on mobile
        if (window.innerWidth <= 768) {
            iframe.style.width = '150px';
            iframe.style.height = '250px';
            iframe.style.resize = 'none';
        }
    } catch (error) {
        console.error("Error:", error);
    }
})();
