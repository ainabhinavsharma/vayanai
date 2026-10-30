import fs from 'fs';
import path from 'path';
import {
  PROFILING_QUESTIONS,
  DATA_ANALYST_QUESTIONS,
  AIML_QUESTIONS,
  OPERATIONS_QUESTIONS,
  getTechnicalQuestionsForTrack,
  computeDbertProfile
} from '../lib/data/intern-questions';

const outPath = path.join(process.cwd(), 'data', 'questions.json');
const questionsData = {
  profiling: PROFILING_QUESTIONS,
  tracks: {
    'Data Analyst': getTechnicalQuestionsForTrack('Data Analyst'),
    'Artificial Intelligence': getTechnicalQuestionsForTrack('Artificial Intelligence'),
    'Sustainable Regional Operations & Growth': getTechnicalQuestionsForTrack('Sustainable Regional Operations & Growth'),
    'Operations': getTechnicalQuestionsForTrack('Operations')
  }
};

fs.writeFileSync(outPath, JSON.stringify(questionsData, null, 2), 'utf-8');
console.log(`✓ Exported questions bank to ${outPath}`);
