const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
console.log("Starting compilation in:", srcDir);

let indexHtml = fs.readFileSync(path.join(srcDir, 'Coordinator.html'), 'utf8');

// Replace common_css
if (indexHtml.includes("<?!= include('common_css'); ?>")) {
  const commonCss = fs.readFileSync(path.join(srcDir, 'common_css.html'), 'utf8');
  indexHtml = indexHtml.replace("<?!= include('common_css'); ?>", commonCss);
  console.log("✓ Inlined common_css");
}

// Replace coordinator_attendance_css
if (indexHtml.includes("<?!= include('coordinator_attendance_css'); ?>")) {
  const coordCss = fs.readFileSync(path.join(srcDir, 'coordinator_attendance_css.html'), 'utf8');
  indexHtml = indexHtml.replace("<?!= include('coordinator_attendance_css'); ?>", coordCss);
  console.log("✓ Inlined coordinator_attendance_css");
}

// Replace forms_css
if (indexHtml.includes("<?!= include('forms_css'); ?>")) {
  const formsCss = fs.readFileSync(path.join(srcDir, 'forms_css.html'), 'utf8');
  indexHtml = indexHtml.replace("<?!= include('forms_css'); ?>", formsCss);
  console.log("✓ Inlined forms_css");
}

// Replace forms_modals
if (indexHtml.includes("<?!= include('forms_modals'); ?>")) {
  const formsModals = fs.readFileSync(path.join(srcDir, 'forms_modals.html'), 'utf8');
  indexHtml = indexHtml.replace("<?!= include('forms_modals'); ?>", formsModals);
  console.log("✓ Inlined forms_modals");
}

// Replace forms_js
if (indexHtml.includes("<?!= include('forms_js'); ?>")) {
  const formsJs = fs.readFileSync(path.join(srcDir, 'forms_js.html'), 'utf8');
  indexHtml = indexHtml.replace("<?!= include('forms_js'); ?>", formsJs);
  console.log("✓ Inlined forms_js");
}

// Replace coordinator_attendance_js
if (indexHtml.includes("<?!= include('coordinator_attendance_js'); ?>")) {
  const coordJs = fs.readFileSync(path.join(srcDir, 'coordinator_attendance_js.html'), 'utf8');
  indexHtml = indexHtml.replace("<?!= include('coordinator_attendance_js'); ?>", coordJs);
  console.log("✓ Inlined coordinator_attendance_js");
}

const distDir = path.join(srcDir, 'dist');
if (!fs.existsSync(distDir)){
  fs.mkdirSync(distDir);
}
fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');
console.log("✓ Successfully compiled dist/index.html for external hosting!");
