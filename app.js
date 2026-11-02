function cleanBook(book) {
    let author = "Unkown";

    if (book.author_name) {
        author = book.author_name[0];
    }

    return {
        title:book.title,
        author: author,
        year: book.first_publish_year
    };
}

fetch("https://openlibrary.org/search.json?q=lgbtq&limit=5")
    .then(response => response.json())
    .then(data => {
        console.log(data);

        let cleanBooks = [];

        for (let book of data.docs) {
            let newBook = cleanBook(book);
            cleanBooks.push(newBook);
        }

        console.log("Cleaned Books:", cleanBooks);
    });

