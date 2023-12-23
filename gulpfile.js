const gulp = require('gulp');
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const sass = require('gulp-sass')(require('sass'));

gulp.task('build:css', () => {
  return gulp.src('src/*.scss')
    .pipe(sass({ outputStyle: 'compressed' }, { errLogToConsole: true }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('public/assets'));
});

gulp.task('build:js', function () {
  return gulp.src('src/*.js')
    .pipe(terser({
      ecma: 6,
      keep_fnames: false,
      mangle: {
        toplevel: true,
      },
    }))
    .pipe(replace('.js', '.min.js'))
    .pipe(replace('.css', '.min.css'))
    .pipe(replace('src/', 'assets/'))
    .pipe(replace('.min.json', '.json'))
    .pipe(replace('.min.css(', '.css('))
    .pipe(replace('assets/overlays/', 'overlays/'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('public/assets'));
});

gulp.task('build:html', function () {
    gulp.src('index.html')
        .pipe(replace('timetables.js', 'timetables.min.js'))
        .pipe(replace('public/', ''))
        .pipe(replace('.css', '.min.css'))
        .pipe(replace('src/', 'assets/'))
        .pipe(gulp.dest('public'));
    gulp.src('src/*.svg')
        .pipe(gulp.dest('public/assets'));
    return gulp.src('src/*.png')
        .pipe(gulp.dest('public/assets'));
});

gulp.task('build:overlays', function () {
    return gulp.src('src/overlays/*.html')
        .pipe(replace('public/assets/', 'assets/'))
        .pipe(gulp.dest('public/overlays'));
});

gulp.task('build:tablice-td2', gulp.parallel('build:css', 'build:js', 'build:html', 'build:overlays'));