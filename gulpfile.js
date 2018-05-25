var gulp = require('gulp');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var ui5preload = require('gulp-ui5-preload');
var eslint = require('gulp-eslint');
var merge = require('merge-stream');
var browserSync = require("browser-sync");
var GulpMem = require('gulp-mem');
var less = require('gulp-less');
var del = require('del');
var filter = require('gulp-filter');
var seq = require('run-sequence');
var console = require('console');

var SRC_ROOT = "./webapp";
var DEST_ROOT = "./dist";


var gulpMem = new GulpMem();
gulpMem.serveBasePath = DEST_ROOT;
gulpMem.enableLog = false;


var buildJs = () => {
  // use to avoid an error cause whole gulp failed
  var b = babel()
    .on("error", (e) => {
      console.log(e.stack);
      b.end();
    });
  return gulp.src([`${SRC_ROOT}/**/*.js`, `!${SRC_ROOT}/**/lib/*.js`])
    .pipe(sourcemaps.init())
    .pipe(b)
    .pipe(sourcemaps.write('.'));
};

var buildCss = () => {
  return gulp.src(`${SRC_ROOT}/**/css/*.less`, { base: `${SRC_ROOT}` })
    .pipe(less());
};

var copy = () => {
  return merge(
    gulp.src([`${SRC_ROOT}/**/*`, `!${SRC_ROOT}/**/*.js`, `!${SRC_ROOT}/**/*.less`], { base: `${SRC_ROOT}` }),
    gulp.src([`${SRC_ROOT}/**/lib/*`], { base: `${SRC_ROOT}` })
  );
};

var build = () => {
  return merge(copy(), buildJs(), buildCss());
};


gulp.task('default', () => seq('clean', 'build:mem', 'bs', 'watch:mem'));

gulp.task('test', () => seq('clean', 'build:mem', 'bs:test', 'watch:mem'));

gulp.task('build:mem', () => {
  return build()
    .pipe(gulpMem.dest(DEST_ROOT));
});

gulp.task('build', () => {
  return build()
    .pipe(gulp.dest(DEST_ROOT))
    .pipe(filter(['**/*.js', '**/*.xml', '!**/lib/*']))
    .pipe(ui5preload({ base: `${DEST_ROOT}/sap/ui5/miitest2018`, namespace: 'sap.ui5.miitest2018' }))
    .pipe(gulp.dest(`${DEST_ROOT}/sap/ui5/miitest2018`));
});

gulp.task('clean', () => {
  del(DEST_ROOT);
});

gulp.task('bs', () => {
  var middlewares = require('./proxies');
  middlewares.push(gulpMem.middleware);
  browserSync.init({
    server: {
      baseDir: DEST_ROOT,
      middleware: middlewares
    }
  });
});

gulp.task('bs:test', () => {
  var middlewares = require('./proxies');
  middlewares.push(gulpMem.middleware);
  browserSync.init({
    server: {
      baseDir: DEST_ROOT,
      middleware: middlewares,
      notify: false
    },
    startPath: "sap/ui5/miitest2018/test/mockServer.html"
  });
});

// run gulp lint to auto fix src directory
gulp.task('lint', () => {
  return gulp.src([`${SRC_ROOT}/**/*.js`, '!node_modules/**'])
    .pipe(eslint({ fix: true, useEslintrc: true }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(gulp.dest(SRC_ROOT));
});

gulp.task('watch:mem', () => {
  gulp.watch(`${SRC_ROOT}/**/*`, () => seq('build:mem', 'reload'));
});

gulp.task('live-build', ['build', 'bs'], () => {
  gulp.watch(`${SRC_ROOT}/**/*`, () => seq('build', 'reload'));
});

gulp.task('reload', () => browserSync.reload());

gulp.task("build-js", buildJs);

gulp.task('build-css', buildCss);

gulp.task("copy", copy);