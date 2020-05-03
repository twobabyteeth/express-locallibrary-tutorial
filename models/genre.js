var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GenreSchema = new Schema (
	{
		name: {type: String, required: true, min: 3, max: 100},
	}
);


// virtual for GenreSchema's url
GenreSchema
.virtual('url')
.get(function() {
	return '/catalogue/genre/' + this._id;
});

// export model
module.exports = mongoose.model('Genre', GenreSchema);