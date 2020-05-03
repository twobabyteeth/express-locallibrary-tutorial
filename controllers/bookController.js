const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');

exports.index = function(req, res) {

	async.parallel({
		book_count: function(callback) {
			Book.countDocuments({}, callback); // pass an empty object to match condition to find all documents of this collection
		},
		book_instance_count: function(callback) {
			BookInstance.countDocuments({}, callback);
		},
		book_instance_available_count: function(callback) {
			BookInstance.countDocuments({status:'Available'}, callback);
		},
		author_count: function(callback) {
			Author.countDocuments({}, callback);
		},
		genre_count: function(callback) {
			Author.countDocuments({}, callback);
		}
	}, function(err, results) {
		res.render('index', {title: 'Local Library Home', error: err, data: results});
	});
};

// display list of all books
exports.book_list = function(req, res, next) {
	Book.find({}, 'title author')
		.populate('author')
		.exec(function (err, list_books) {
			if (err) { return next(err); }
			// successful, so render
			res.render('book_list', {title: 'Book List', book_list: list_books}); 
		});
};

// display detail page of a specific book
exports.book_detail = function(req, res, next) {
	async.parallel({
		book: function(callback) {
			Book.findById(req.params.id)
				.populate('author')
				.populate('genre')
				.exec(callback);
		},
		book_instance: function(callback) {
			BookInstance.find({'book':req.params.id})
			.exec(callback);
		},
	}, function(err, results) {
		if (err) { return next(err); }
		if (results.book==null) { // No results.
			var err = new Error('Book not found');
			err.status = 404;
			return next(err);
		}
		// successful, so render
		res.render('book_detail', {title: results.book.title, book: results.book, book_instances: results.book_instance});
	});
};

// display book create form on GET
exports.book_create_get = function(req, res, next) {

	// get all authors and genres, which we can use for adding to our book
	async.parallel({
		authors: function(callback) {
			Author.find(callback);
		},
		genres: function(callback) {
			Genre.find(callback);
		},
	}, function(err, results) {
		if (err) { return next(err); }
		res.render('book_form', {title: 'Create Book', authors: results.authors, genres: results.genres});
	});
};

// handle book create on POST
exports.book_create_post = [
	// convert the genre to an array
	(req, res, next) => {
		if(!(req.body.genre instanceof Array)){
			if(typeof req.body.genre==='undefined')
			req.body.genre=[];
			else
			req.body.genre=new Array(req.body.genre);
		}
		next();
	},

	// validate fields
	body('title', 'Title must not be empty.').trim().isLength({min: 1}),
	body('author', 'Author must not be empty.').trim().isLength({min: 1}),
	body('summary', 'Summary must not be empty.').trim().isLength({min: 1}),
	body('isbn', 'ISBN must not be empty').trim().isLength({min: 1}),

	// sanitize fields
	sanitizeBody('*').escape(),

	// process request after validation and sanitisation
	(req, res, next) => {

		// extract the validation errors from a request
		const errors = validationResult(req);

		// create a book object with escaped and trimmed data
		var book = new Book(
			{
				title: req.body.title,
				author: req.body.author,
				summary: req.body.summary,
				isbn: req.body.isbn,
				genre: req.body.genre
			});

		if (!errors.isEmpty()) {
			// there are errors. render form again with sanitised values/error messages.

			// get all authors and genres for form.
			async.parallel({
				authors: function(callback) {
					Author.find(callback);
				},
				genres: function(callback) {
					Genre.find(callback);
				},
			}, function(err, results) {
				if (err) { return next(err); }
			
				// mark our selected genres as checked
				for (let i = 0; i < results.genres.length; i++) {
					if (book.genre.indexOf(results.genres[i]._id) > -1) {
						results.genres[i].checked='true';
					}
				}
				res.render('book_form', {title: 'Create Book', authors:results.authors, genres:results.genres, book: book, errors: errors.array()});
			});
			return;
		}
		else {
			// data from form is valid. save book.
			book.save(function (err) {
				if (err) { return next(err); }
				// successful - redirect to new book record.
				res.redirect(book.url);
				});
		}
	}
];


// display book delete form on GET
exports.book_delete_get = function(req, res, next) {
	async.parallel({
		book: function(callback) {
			Book.findById(req.params.id).exec(callback)
		},
		book_instance: function(callback) {
			BookInstance.find({'book':req.params.id}).exec(callback)
		},
	}, function(err, results) {
		if (err) {return next(err);}
		if (results.book==null) {
			res.redirect('/catalogue/books');
		}
		res.render('book_delete', {title : 'Delete Book', book: results.book, book_instances: results.book_instance});
	});
};

// handle book delete on POST
exports.book_delete_post = function(req, res, next) {
	async.parallel({
		book: function(callback) {
			Book.findById(req.body.id).exec(callback)
		},
		book_instance: function(callback) {
			BookInstance.find({'book':req.body.id}).exec(callback)
		},
	}, function(err, results) {
		if (err) {return next(err);}
		if (results.book_instance.length > 0) {
			res.render('book_delete', {title: 'Delete Book', book: results.book, book_instances: results.book_instance});
			return;
		}
		else {
			Book.findByIdAndRemove(req.body.id, function deleteBook(err) {
				if (err) {return next(err);}
				res.redirect('/catalogue/books')
			});
		}
	});
};

// display book update form on GET
exports.book_update_get = function(req, res, next) {
	// get book, authors and genres for form
	async.parallel({
		book: function(callback) {
			Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
		},
		authors: function(callback) {
			Author.find(callback);
		},
		genres: function(callback) {
			Genre.find(callback);
		},
		}, function(err, results) {
			if (err) {return next(err);}
			if (results.book==null) {
				var err = new Error('Book not found');
				err.status = 404;
				return next(err);
			}

			for (var all_g_iter = 0; all_g_iter < results.book.genre.length; all_g_iter++) {
				for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
					if (results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
						results.genres[all_g_iter].checked='true';
					}
				}
			}
			res.render('book_form', {title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book});
		});
};

// handle book update on POST
exports.book_update_post = [
	// convert the genre to an array
	(req, res, next) => {
		if(!(req.body.genre instanceof Array)){
			if(typeof req.body.genre==='undefined')
			req.body.genre=[];
			else
			req.body.genre=new Array(req.body.genre);
		}
		next();
	},

	// validate fields
	body('title', 'Title must not be empty.').trim().isLength({min: 1}),
	body('author', 'Author must not be empty.').trim().isLength({min: 1}),
	body('summary', 'Summary must not be empty.').trim().isLength({min: 1}),
	body('isbn', 'isbn must not be empty.').trim().isLength({min: 1}),

	// sanitize fields
	sanitizeBody('title').escape(),
	sanitizeBody('author').escape(),
	sanitizeBody('summary').escape(),
	sanitizeBody('isbn').escape(),
	sanitizeBody('genre.*').escape(),

	// process request after validation and sanitization
	(req, res, next) => {

		// extract the validation errors from a request
		const errors = validationResult(req);

		// create a book object with escaped/trimmed date and old id
		var book = new Book(
		{
			title: req.body.title,
			author: req.body.author,
			summary: req.body.summary,
			isbn: req.body.isbn,
			genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
			_id: req.params.id
		});

	if (!errors.isEmpty()) {
		// there are errors. render form again with sanitzed values/error messages.

		// get all authors and genres for form
		async.parallel( {
			authors: function(callback) {
				Author.find(callback);
			},
		}, function(err, results) {
			if (err) {return next(err);}

			// mark our selected genres as checked
			for (let i = 0; i < results.genres.length; i++) {
				if (book.genre.indexOf(results.genres[i]._id) > -1) {
					results.genres[i].checked='true';
				}
			}
			res.render('book_form', {title: 'Update Book', authors: results.authors, genres: result.genres, book: book, errors: errors.array()});
		});
		return;
	}
	else {
		// data from form is valid. update the record.
		Book.findByIdAndUpdate(req.params.id, book, {}, function (err, thebook) {
			if (err) { return next(err); }
				// successful - redirect to book detail page
				res.redirect(thebook.url);
			});
		}
	}
];