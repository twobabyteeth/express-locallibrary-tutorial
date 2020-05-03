var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var BookInstanceSchema = new Schema (
	{
		book: {type: Schema.Types.ObjectId, ref: 'Book', required: true},
		imprint: {type: String, required: true},
		status: {type: String, required: true, enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], default: 'Maintenance'},
		due_back: {type: Date, default: Date.now},
	}
);

// virtual for BookInstance's URL
BookInstanceSchema
.virtual('url')
.get(function () {
	return '/catalogue/bookinstance/' + this._id;
});

// virtual for return dates
BookInstanceSchema
.virtual('due_back_formatted')
.get(function () {
	return moment(this.due_back).format('MMMM Do, YYYY');
});

// export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);