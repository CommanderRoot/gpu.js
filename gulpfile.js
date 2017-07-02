const fs = require('fs');
const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const gutil = require('gulp-util');
const header = require('gulp-header');
const browserSync = require('browser-sync');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const pkg = require('./package.json');
const jsprettify = require('gulp-jsbeautifier');
const babel = require('gulp-babel');
const stripComments = require('gulp-strip-comments');
const glob = require('glob');

gulp.task('refactor', ()=>{
	glob('src/**/*.js', (err, files)=>{
		files.forEach(file=>{
			fs.readFile(file, (err,data)=>{
			let dataString = data.toString();
			let chunks = [];
			let stream = false;
		
			chunks = dataString.split("\n");
			for (var i = 0; i < chunks.length; i++) {
				if(stream){
					if(chunks[i]===/(\s+\*\s+)|(\*\/)/g){
						stream = !stream;
					}else{
						let temp7 = chunks[i].match(/\t+\s+\*\s+/g); 
						// console.log(temp7)
						let temp = chunks[i].replace(/\t+\s+\*\s+/g, '');
						// console.log(temp);
						let paramName = temp.match(/(^\w+)/g);
						if(paramName){
							paramName = paramName[0];
							let typeAndRest =  temp.match(/(^\w+)+(\s+-\s+{)/g);
							if(typeAndRest){
								temp1 = temp.replace(typeAndRest, '');
								temp2 = paramName + ' {' + temp1;
								temp3 =  temp7 + '@param ' + temp2;
								// console.log(temp3);
								chunks[i] = temp3
							}
					}
						}
				}else{
					
					if(chunks[i].includes('Properties:')){
						chunks[i] = chunks[i].slice(0,chunks[i].indexOf('P')) + '*';
						stream = !stream;
					}

				}


			}

				// if(stream){
				// 	if(chunks[i]===' *' || chunks[i]===' */'){
				// 		stream = !stream;
				// 	}else{
				// 		chunks[i] = chunks[i].replace(/\*\s+/g, '');
				// 		console.log(chunks[i]);
				// 		let paramName = chunks[i].match(/(^\w+)/g)[0];
				// 		let typeAndRest =  chunks[i].match(/(^\w+)+(\s+-\s+{)/g)[0];
				// 		chunks[i] = chunks[i].replace(typeAndRest, '');
				// 		chunks[i] = paramName + ' {' + chunks[i];
				// 		chunks[i] = ' * @param' + chunks[i];
				// 	}			
				// }else{
					// if(chunks[i].match(/^\s+\* Function:/g)){
						// console.log(chunks[i]);
					// console.log(chunks[i]);
						// chunks[i] = chunks[i].replace('Function:','@name');
						// chunks[i] = '';
					/*} else if (chunks[i].startsWith('  ')){
						stream = !stream;
					} else if (chunks[i].startsWith(' * Returns:')) {
						chunks[i] = '';
						chunks[i+1] = ' * @returns' + chunks[i+1].replace(/^\*\s+/g, '');
					}*/
			// }
			const finalData = chunks.join('\n');
			fs.writeFile(file, finalData);

			})
		})
	})
})

/// Build the scripts
gulp.task('build', function() {
	browserify('./src/index.js')
	.bundle()
	.pipe(source('gpu.js'))
	.pipe(buffer())
	.pipe(stripComments())
	.pipe(babel())
		.pipe(header(fs.readFileSync('./src/wrapper/header.js', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'));

	browserify('./src/index-core.js')
	.bundle()
	.pipe(source('gpu-core.js'))
	.pipe(buffer())
	.pipe(stripComments())
	.pipe(babel())
		.pipe(header(fs.readFileSync('./src/wrapper/header.js', 'utf8'), { pkg : pkg }))
		.pipe(gulp.dest('bin'));
});

/// Minify the build script, after building it
gulp.task('minify', ['build'], function() {
	return (
		gulp.src('bin/gpu.js')
			.pipe(rename('gpu.min.js'))
			.pipe(
				uglify({preserveComments: 'license'})
				.on('error', gutil.log)
			)
			.pipe(gulp.dest('bin'))
	) && (
		gulp.src('bin/gpu-core.js')
			.pipe(rename('gpu-core.min.js'))
			.pipe(
				uglify({preserveComments: 'license'})
				.on('error', gutil.log)
			)
			.pipe(gulp.dest('bin'))
	);
});

/// The browser sync prototyping
gulp.task('bsync', function(){
	// Syncs browser
	browserSync.init({
		server: {
			baseDir: './'
		},
		open: true,
		startPath: "/test/html/test-all.html",
		// Makes it easier to test on external mobile devices
		host: "0.0.0.0",
		tunnel: true
	});

	// Detect change -> rebuild TS
	gulp.watch(['src/**.js'], ['minify']);
});

/// Auto rebuild and host
gulp.task('default', ['minify','bsync']);


/// Beautify source code
/// Use before merge request
/// Excludes the parser.js that was jison generated
gulp.task('beautify', function() {
	gulp.src(['src/**/*.js', '!src/parser.js'])
		.pipe(jsprettify({
			indent_size: 3,
			indent_char: ' ',
			indent_with_tabs: true
		}))
		.pipe(gulp.dest('src'));
});