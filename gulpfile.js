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
    .pipe(terser())
    .pipe(replace(/\.js/g, '.min.js'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('public/assets'));
});

gulp.task('build:html', function () {
    return gulp.src('index.html')
        .pipe(replace('timetables.js', 'timetables.min.js'))
        .pipe(replace('src/', 'assets/'))
        .pipe(replace('public/', ''))
        .pipe(replace('.css', '.min.css'))
        .pipe(gulp.dest('public'));
});

gulp.task('build:sts', gulp.parallel('build:css', 'build:js', 'build:html'));