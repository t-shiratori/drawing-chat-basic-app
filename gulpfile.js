var gulp = require('gulp'),
    gulpPlugins = require('gulp-load-plugins')(),
    browserify = require('browserify'),
    babelify = require('babelify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    browserSync = require('browser-sync');

var src_url_browserify = 'src/sketch.js',
    dest_url_browserify = 'public/javascripts/',
    output_file_name_browserify = 'sketch.js',
    src_url_watch_js = 'src/**/*.js',
    base_dir_serve = 'public/dist',
    src_url_sass = 'src/**/*.scss',
    dest_url_sass = 'public/stylesheets/';


//browserify
gulp.task('browserify',function (){
  browserify({
    entries: src_url_browserify,
    extensions: ['.js']
  })
  .transform(babelify,{presets: ['es2015']},{ debug: true })
	.bundle()
  .pipe(gulpPlugins.plumber())
	.on('error', function (err) {
		console.log('Error : ' + err.message);
		this.emit('end');
	})
  .pipe(source(output_file_name_browserify))//ここでvinylに変換される
  .pipe(buffer()) //uglify()するときにこれをやらないとエラーになる
  .pipe(gulpPlugins.uglify())
	.pipe(gulp.dest(dest_url_browserify))
  .pipe(browserSync.stream());//タスクの中で変更が発生したファイルのみを読み込み、画面に再描画する
});

//sass
gulp.task('sass',function(){
  return gulp.src(src_url_sass)
    .pipe(gulpPlugins.sass().on('error', gulpPlugins.sass.logError))
    .pipe(gulp.dest(dest_url_sass))
    .pipe(browserSync.stream());
});

//watch
gulp.task('watch', function() {
  var targetsJs = [src_url_watch_js];
  var targetsCss = [src_url_sass];
  gulp.watch(targetsJs, ['browserify']);
  gulp.watch(targetsCss, ['sass']);
});


gulp.task('default',['watch']);
