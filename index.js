var mkdirp = require('mkdirp');
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();

app.use(fileUpload());
app.use(express.static('public'))

function initEnvironment() {
    mkdirp('public/uploads', function(err) {
        if (err)
            console.error("Couldn't create uploads dir: %s", err);
    });
}

initEnvironment();

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.post('/upload', function(req, res) {
    var file;

    console.log('Got an upload!');

    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

    file = req.files.file;
    file.mv('public/uploads/filename.jpg', function(err) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send('File uploaded!');
        }
    });
});

app.listen(8080, function () {
    console.log('Example app listening on port 8080!');
});
