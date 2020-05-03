const { body, validationResult} = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var Book = require('../models/book');

var BookInstance = require('../models/bookinstance');

var async = require('async');

// display list of all bookinstances
exports.bookinstance_list = function(req, res, next) {
	BookInstance.find()
		.populate('book')
		.exec(function (err, list_bookinstance) {
			if (err) { return next(err); }
			// successful, so render
			res.render('bookinstance_list', {title: 'Book Instance List', bookinstance_list: list_bookinstance});
		});
};

// display detail page of a specific bookinstance
exports.bookinstance_detail = function(req, res, next) {
	BookInstance.findById(req.params.id)
	.populate('book')
	.exec(function (err, bookinstance) {
		if (err) { return next(err); }
		if (bookinstance==null) { // no results.
			var err = new Error('Book copy not found');
			err.status = 404;
			return next(err);
		}
		// successful, so render.
		res.render('bookinstance_detail', { title: 'Copy: '+bookinstance.book.title, bookinstance: bookinstance});
		})
};

// display bookinstance create form on GET
exports.bookinstance_create_get = function(req, res, next) {
	Book.find({}, 'title')
	.exec(function (err, books) {
		if (err) {return next(err); }
	
		res.render('bookinstance_form', {title: 'Create Book Instance', book_list: books});
	});
};

// handle bookinstance create on POST
exports.bookinstance_create_post = [

	body('book', 'Book must be specified').trim().isLength({min: 1}),
	body('imprint', 'Imprint must not be empty').trim().isLength({min: 1}),
	body('due_back', 'Invalid date').optional({checkFalsy:true}).isISO8601(),

	sanitizeBody('book').escape(),
	sanitizeBody('imprint').escape(),
	sanitizeBody('status').trim().escape(),
	sanitizeBody('due_back').toDate(),

	(req, res, next) => {

		const errors = validationResult(req);

		var bookinstance = new BookInstance(
			{ book: req.body.book,
				imprint: req.body.imprint,
				status: req.body.status,
				due_back: req.body.due_back
			});

		if (!errors.isEmpty()){
			Book.find({}, 'title')
				.exec(function (err, books) {
					if (err) { return next(err); }
					res.render('bookinstance_form', {title: 'Create Book Instance', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance: bookinstance });
			});
			return;
		}
		else {
			bookinstance.save(function (err) {
				if (err) {return next (err); }
				res.redirect(bookinstance.url);
			});
		}
}

];

// display bookinstance delete form on GET
exports.bookinstance_delete_get = function(req, res, next) {
	
	BookInstance.findById(req.params.id)
	.populate('book')
	.exec(function (err, bookinstance) {
		if (err) { return next(err); }
		if (bookinstance==null) {
			res.redirect('/catalogue/bookinstances');
		}
		res.render('bookinstance_delete', {title : 'Delete Copy', bookinstance: bookinstance});
	})
};

// handle bookinstance delete on POST
exports.bookinstance_delete_post = function(req, res, next) {
	
	BookInstance.findByIdAndRemove(req.body.id, function deleteBookInstance(err) {
		if (err) {return next(err);}

		res.redirect('/catalogue/bookinstances')
		});
};

// display bookinstance update form on GET
exports.bookinstance_update_get = function(req, res, next) {
	// get bookinstance and book for form
	async.parallel({
		bookinstance: function(callback) {
			BookInstance.findById(req.params.id).populate('book').exec(callback)
		},
		books: function(callback) {
			Book.find(callback)
		},
		}, function(err, results) {
			if (err) {return next(err);}
			if (results.bookinstance==null) {
				var err = new Error('Copy not found');
				err.status = 404;
				return next(err);
			}
			res.render('bookinstance_form', {title: 'Update Copy', book_list: results.books, selected_book: results.bookinstance.book._id, bookinstance: results.bookinstance});
		});
};

// handle bookinstance update on POST
exports.bookinstance_update_post = [

	body('book', 'Book must be specified').trim().isLength({min: 1}),
	body('imprint', 'Imprint must not be empty').trim().isLength({min: 1}),
	body('due_back', 'Invalid date').optional({checkFalsy:true}).isISO8601(),

	sanitizeBody('book').escape(),
	sanitizeBody('imprint').escape(),
	sanitizeBody('status').trim().escape(),
	sanitizeBody('due_back').toDate(),

	(req, res, next) => {

		const errors = validationResult(req);

		var bookinstance = new BookInstance(
			{ book: req.body.book,
				imprint: req.body.imprint,
				status: req.body.status,
				due_back: req.body.due_back,
				_id: req.params.id
			});

		if (!errors.isEmpty()){
			res.render('bookinstance_form', {title: 'Update Copy', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance: bookinstance });
			return;
		}
	
		else {
		// data from form is valid. update the record.
		BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err, thebookinstance) {
			if (err) { return next(err); }
				// successful - redirect to book detail page
				res.redirect(thebookinstance.url);
			});
		}
	}
];