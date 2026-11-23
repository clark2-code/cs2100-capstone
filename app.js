let searchForm = document.querySelector("#search-form");
let keywordsInput = document.querySelector("#keywords");
let minYearInput = document.querySelector("#min-year");
let maxYearInput = document.querySelector("#max-year");
let searchButton = document.querySelector("#search-button");
let sortSelect = document.querySelector("#sort-books");
let bookList = document.querySelector("#books");
let resultsStatus = document.querySelector("#results-status");
let formStatus = document.querySelector("#form-status");
let currentYear = new Date().getFullYear();

let cleanBooks = [];
let searchWords = "lgbtq";
let minYear = null;
let maxYear = null;
let loading = false;
let loaded = false;

minYearInput.max = currentYear;
maxYearInput.max = currentYear;
maxYearInput.placeholder = "e.g., " + currentYear;

function cleanBook(book) {
    let author = "Unknown author";
    let year = null;

    if (book.author_name && book.author_name.length > 0) {
        author = book.author_name[0];
    }

    if (Number.isInteger(book.first_publish_year) && book.first_publish_year >= 0) {
        year = book.first_publish_year;
    }

    return {
        title: book.title || "Untitled",
        author: author,
        year: year
    };
}

function readYear(input) {
    if (input.value.trim() === "") {
        return null;
    }
    return Number(input.value);
}

function showError(input, message) {
    let error = document.querySelector("#" + input.id + "-error");
    error.textContent = message;
    input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
}

function checkYear(input) {
    let year = readYear(input);

    if (input.validity.badInput ||
        (year !== null && (!Number.isInteger(year) || year < 0 || year > currentYear))) {
        return "Enter a whole-number year from 0 to " + currentYear + ", or leave this blank.";
    }

    return "";
}

function validateForm(moveFocus) {
    let keywordsError = "";
    let words = keywordsInput.value.trim();
    let minError = checkYear(minYearInput);
    let maxError = checkYear(maxYearInput);
    let firstYear = readYear(minYearInput);
    let lastYear = readYear(maxYearInput);

    if (words.length < 2 || words.length > 100) {
        keywordsError = "Enter search keywords using 2–100 characters.";
    }

    if (minError === "" && maxError === "" &&
        firstYear !== null && lastYear !== null && firstYear > lastYear) {
        maxError = "The latest year must be the same as or later than the earliest year.";
    }

    showError(keywordsInput, keywordsError);
    showError(minYearInput, minError);
    showError(maxYearInput, maxError);

    let firstInvalid = searchForm.querySelector('[aria-invalid="true"]');
    if (firstInvalid) {
        formStatus.textContent = "Please correct the marked fields before searching.";
        if (moveFocus) {
            firstInvalid.focus();
        }
        return false;
    }

    formStatus.textContent = "";
    return true;
}

function displayBooks() {
    let visibleBooks = [];

    for (let book of cleanBooks) {
        if (minYear !== null && (book.year === null || book.year < minYear)) {
            continue;
        }
        if (maxYear !== null && (book.year === null || book.year > maxYear)) {
            continue;
        }
        visibleBooks.push(book);
    }

    if (sortSelect.value === "title") {
        visibleBooks.sort((first, second) => first.title.localeCompare(second.title));
    } else if (sortSelect.value === "newest" || sortSelect.value === "oldest") {
        visibleBooks.sort((first, second) => {
            if (first.year === null && second.year === null) return 0;
            if (first.year === null) return 1;
            if (second.year === null) return -1;
            if (sortSelect.value === "newest") return second.year - first.year;
            return first.year - second.year;
        });
    }

    let fragment = document.createDocumentFragment();

    for (let book of visibleBooks) {
        let card = document.createElement("li");
        card.className = "book-card";

        let title = document.createElement("h3");
        title.textContent = book.title;

        let author = document.createElement("p");
        author.textContent = "Author: " + book.author;

        let year = document.createElement("p");
        year.textContent = "First published: " + (book.year === null ? "Unknown" : book.year);

        card.appendChild(title);
        card.appendChild(author);
        card.appendChild(year);
        fragment.appendChild(card);
    }

    bookList.textContent = "";
    bookList.appendChild(fragment);

    if (cleanBooks.length === 0) {
        resultsStatus.textContent = 'No books found for "' + searchWords + '". Try different keywords.';
    } else if (visibleBooks.length === 0) {
        resultsStatus.textContent = 'None of the ' + cleanBooks.length + ' loaded books for "' +
            searchWords + '" match those years. Widen or clear the year range and search again.';
    } else {
        resultsStatus.textContent = 'Showing ' + visibleBooks.length + ' of ' + cleanBooks.length +
            ' loaded books for "' + searchWords + '".';
    }
}

function loadBooks() {
    loading = true;
    loaded = false;
    searchButton.disabled = true;
    searchButton.textContent = "Searching…";
    bookList.textContent = "";
    bookList.setAttribute("aria-busy", "true");
    resultsStatus.textContent = "Loading books from Open Library…";

    let url = "https://openlibrary.org/search.json?q=" + encodeURIComponent(searchWords) +
        "&limit=50&fields=title,author_name,first_publish_year";

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("The book request failed.");
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data.docs)) {
                throw new Error("The book response was not in the expected format.");
            }

            cleanBooks = [];
            for (let book of data.docs) {
                cleanBooks.push(cleanBook(book));
            }

            loaded = true;
            displayBooks();
        })
        .catch(() => {
            cleanBooks = [];
            loaded = false;
            resultsStatus.textContent = "Books could not be loaded. Check your connection and select Search to try again.";
        })
        .finally(() => {
            loading = false;
            searchButton.disabled = false;
            searchButton.textContent = "Search";
            bookList.setAttribute("aria-busy", "false");
        });
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    if (loading || !validateForm(true)) {
        return;
    }

    let newWords = keywordsInput.value.trim();
    minYear = readYear(minYearInput);
    maxYear = readYear(maxYearInput);

    if (loaded && newWords === searchWords) {
        displayBooks();
    } else {
        searchWords = newWords;
        loadBooks();
    }
});

searchForm.addEventListener("input", () => {
    if (searchForm.querySelector('[aria-invalid="true"]')) {
        validateForm(false);
    }
});

sortSelect.addEventListener("change", () => {
    if (loaded && !loading) {
        displayBooks();
    }
});

loadBooks();
