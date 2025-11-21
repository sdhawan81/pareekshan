import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';

/**
 * Generate a sample PDF form with various AcroForm field types
 */
export async function generateSamplePdfForm(outputPath) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add a page
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    // Get a font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw title
    page.drawText('Sample Registration Form', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0.5)
    });

    // Get the form
    const form = pdfDoc.getForm();

    let yPosition = height - 100;

    // 1. Text field - First Name
    page.drawText('First Name:', { x: 50, y: yPosition, size: 12, font });
    const firstNameField = form.createTextField('firstName');
    firstNameField.addToPage(page, { x: 200, y: yPosition - 5, width: 200, height: 20 });
    firstNameField.enableMultiline();
    firstNameField.setText('');
    yPosition -= 40;

    // 2. Text field - Last Name
    page.drawText('Last Name:', { x: 50, y: yPosition, size: 12, font });
    const lastNameField = form.createTextField('lastName');
    lastNameField.addToPage(page, { x: 200, y: yPosition - 5, width: 200, height: 20 });
    lastNameField.setText('');
    yPosition -= 40;

    // 3. Text field - Email
    page.drawText('Email:', { x: 50, y: yPosition, size: 12, font });
    const emailField = form.createTextField('email');
    emailField.addToPage(page, { x: 200, y: yPosition - 5, width: 200, height: 20 });
    emailField.setText('');
    yPosition -= 40;

    // 4. Text field - Phone (with max length)
    page.drawText('Phone:', { x: 50, y: yPosition, size: 12, font });
    const phoneField = form.createTextField('phone');
    phoneField.addToPage(page, { x: 200, y: yPosition - 5, width: 200, height: 20 });
    phoneField.setMaxLength(15);
    phoneField.setText('');
    yPosition -= 40;

    // 5. Multi-line text field - Address
    page.drawText('Address:', { x: 50, y: yPosition, size: 12, font });
    const addressField = form.createTextField('address');
    addressField.addToPage(page, { x: 200, y: yPosition - 35, width: 200, height: 60 });
    addressField.enableMultiline();
    addressField.setText('');
    yPosition -= 80;

    // 6. Dropdown - Country
    page.drawText('Country:', { x: 50, y: yPosition, size: 12, font });
    const countryDropdown = form.createDropdown('country');
    countryDropdown.addToPage(page, { x: 200, y: yPosition - 5, width: 200, height: 20 });
    countryDropdown.addOptions(['USA', 'Canada', 'UK', 'Australia', 'India', 'Other']);
    countryDropdown.select('USA');
    yPosition -= 50;

    // 7. Radio buttons - Gender
    page.drawText('Gender:', { x: 50, y: yPosition, size: 12, font });
    const genderGroup = form.createRadioGroup('gender');

    page.drawText('Male', { x: 230, y: yPosition, size: 10, font });
    genderGroup.addOptionToPage('Male', page, { x: 200, y: yPosition - 5, width: 15, height: 15 });

    page.drawText('Female', { x: 310, y: yPosition, size: 10, font });
    genderGroup.addOptionToPage('Female', page, { x: 280, y: yPosition - 5, width: 15, height: 15 });

    page.drawText('Other', { x: 400, y: yPosition, size: 10, font });
    genderGroup.addOptionToPage('Other', page, { x: 370, y: yPosition - 5, width: 15, height: 15 });

    yPosition -= 40;

    // 8. Checkboxes - Interests
    page.drawText('Interests:', { x: 50, y: yPosition, size: 12, font });
    yPosition -= 25;

    page.drawText('Sports', { x: 80, y: yPosition, size: 10, font });
    const sportsCheckbox = form.createCheckBox('interests.sports');
    sportsCheckbox.addToPage(page, { x: 50, y: yPosition - 5, width: 15, height: 15 });

    page.drawText('Music', { x: 180, y: yPosition, size: 10, font });
    const musicCheckbox = form.createCheckBox('interests.music');
    musicCheckbox.addToPage(page, { x: 150, y: yPosition - 5, width: 15, height: 15 });

    page.drawText('Reading', { x: 280, y: yPosition, size: 10, font });
    const readingCheckbox = form.createCheckBox('interests.reading');
    readingCheckbox.addToPage(page, { x: 250, y: yPosition - 5, width: 15, height: 15 });

    page.drawText('Travel', { x: 380, y: yPosition, size: 10, font });
    const travelCheckbox = form.createCheckBox('interests.travel');
    travelCheckbox.addToPage(page, { x: 350, y: yPosition - 5, width: 15, height: 15 });

    yPosition -= 40;

    // 9. Checkbox - Terms agreement
    page.drawText('I agree to the terms and conditions', { x: 80, y: yPosition, size: 10, font });
    const termsCheckbox = form.createCheckBox('agreeToTerms');
    termsCheckbox.addToPage(page, { x: 50, y: yPosition - 5, width: 15, height: 15 });
    yPosition -= 40;

    // 10. Checkbox - Newsletter subscription
    page.drawText('Subscribe to newsletter', { x: 80, y: yPosition, size: 10, font });
    const newsletterCheckbox = form.createCheckBox('subscribeNewsletter');
    newsletterCheckbox.addToPage(page, { x: 50, y: yPosition - 5, width: 15, height: 15 });
    newsletterCheckbox.check();
    yPosition -= 40;

    // Add footer
    page.drawText('This is a sample PDF form generated for testing purposes.', {
      x: 50,
      y: 50,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`Sample PDF form created: ${outputPath}`);
    return outputPath;

  } catch (error) {
    throw new Error(`Failed to generate sample PDF: ${error.message}`);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = process.argv[2] || './examples/sample-form.pdf';

  generateSamplePdfForm(outputPath)
    .then(path => {
      console.log('Sample PDF generated successfully!');
      console.log(`File saved at: ${path}`);
    })
    .catch(error => {
      console.error('Failed to generate sample PDF:', error.message);
      process.exit(1);
    });
}
