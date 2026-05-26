/**
 * Series to Subjects Mapping Configuration
 * Maps each study series to available subjects
 */

export const seriesMapping = {
  S1: [
    { key: "PMM", label: "0765 PURE MATHEMATICS WITH MECHANICS" },
    { key: "Physics", label: "0780 PHYSICS" },
    { key: "Chemistry", label: "0715 CHEMISTRY" },
    { key: "ICT", label: "0796 ICT" },
    { key: "Computer Science", label: "0795 COMPUTER SCIENCE" },
    { key: "Further Maths", label: "0775 FURTHER MATHEMATICS" },
  ],
  S2: [
    { key: "PMM", label: "0765 PURE MATHEMATICS WITH MECHANICS" },
    { key: "Physics", label: "0780 PHYSICS" },
    { key: "Chemistry", label: "0715 CHEMISTRY" },
    { key: "Biology", label: "0710 BIOLOGY" },
    { key: "ICT", label: "0796 ICT" },
    { key: "Computer Science", label: "0795 COMPUTER SCIENCE" },
  ],
  S3: [
    { key: "PMS", label: "0770 PURE MATHEMATICS WITH STATISTICS" },
    { key: "Chemistry", label: "0715 CHEMISTRY" },
    { key: "Biology", label: "0710 BIOLOGY" },
    { key: "ICT", label: "0796 ICT" },
    { key: "Food Science", label: "0740 FOOD SCIENCE & NUTRITION" },
  ],
};

/**
 * Get available subjects for a given series
 * @param {string} series - The series code (S1, S2, S3)
 * @returns {Array} Array of subject objects with key and label
 */
export const getSubjectsForSeries = (series) => {
  return seriesMapping[series] || [];
};

/**
 * Get all available series options
 * @returns {Array} Array of series codes
 */
export const getAllSeries = () => {
  return Object.keys(seriesMapping);
};
