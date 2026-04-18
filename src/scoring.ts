import { Profile, Settings } from './db';

export function calculateScore(profile: Partial<Profile>, settings: Settings): { score: number; breakdown: Record<string, number> } {
  let score = 0;
  const breakdown: Record<string, number> = {};

  if (!settings.questions || !profile.answers) {
    return { score, breakdown };
  }

  settings.questions.forEach(q => {
    // Check if this question depends on another
    if (q.dependsOnQuestionId && q.dependsOnAnswer) {
      const parentAnswer = profile.answers?.[q.dependsOnQuestionId];
      if (String(parentAnswer) !== String(q.dependsOnAnswer)) {
        return; // Skip this question if dependency is not met
      }
    }

    const answer = profile.answers?.[q.id];
    let pts = 0;

    if (answer !== undefined && answer !== null && answer !== '') {
      if (q.type === 'select' && q.options) {
        const option = q.options.find(o => o.label === answer);
        if (option) {
          pts = option.score;
        }
      } else if (q.type === 'range' && q.options) {
        const numValue = Number(answer);
        if (!isNaN(numValue)) {
          const option = q.options.find(o => {
            const min = (o.min === undefined || o.min === null || isNaN(o.min)) ? -Infinity : o.min;
            const max = (o.max === undefined || o.max === null || isNaN(o.max)) ? Infinity : o.max;
            return numValue >= min && numValue <= max;
          });
          if (option) {
            pts = option.score;
          }
        }
      } else if (q.type === 'boolean') {
        if (answer === 'Yes' && q.scoreIfTrue !== undefined) {
          pts = q.scoreIfTrue;
        }
      }
    }

    score += pts;
    breakdown[q.text] = pts;

    // Handle follow-ups
    const processFollowUps = (configs: any[], parentAnswer: any, parentPath: string) => {
      configs.forEach(fu => {
        if (String(parentAnswer) === String(fu.triggerValue)) {
          const fuAnswer = profile.conditionalAnswers?.[fu.id];
          if (fuAnswer !== undefined && fuAnswer !== null && fuAnswer !== '') {
            let fuPts = 0;
            if (fu.type === 'boolean') {
              if (fuAnswer === 'Yes' && fu.scoreIfTrue !== undefined) fuPts = fu.scoreIfTrue;
            } else if (fu.type === 'select' && fu.options) {
              const opt = fu.options.find((o: any) => o.label === fuAnswer);
              if (opt) fuPts = opt.score;
            } else if (fu.type === 'range' && fu.options) {
              const num = Number(fuAnswer);
              if (!isNaN(num)) {
                const opt = fu.options.find((o: any) => {
                  const min = (o.min === undefined || o.min === null || isNaN(o.min)) ? -Infinity : o.min;
                  const max = (o.max === undefined || o.max === null || isNaN(o.max)) ? Infinity : o.max;
                  return num >= min && num <= max;
                });
                if (opt) fuPts = opt.score;
              }
            } else if (fu.type === 'text' || fu.type === 'number') {
              if (fu.scoreIfAnswered !== undefined && !isNaN(fu.scoreIfAnswered)) {
                fuPts = fu.scoreIfAnswered;
              }
            }
            score += fuPts;
            const currentPath = `${parentPath} > ${fu.label}`;
            breakdown[currentPath] = fuPts;
            
            if (fu.followUps) {
              processFollowUps(fu.followUps, fuAnswer, currentPath);
            }
          }
        }
      });
    };

    if (q.followUps) {
      processFollowUps(q.followUps, answer, q.text);
    }

    // Legacy conditional field (backward compatibility)
    if (q.hasConditionalField && String(answer) === String(q.conditionalTrigger)) {
      const legacyVal = profile.conditionalAnswers?.[q.id];
      if (legacyVal !== undefined && legacyVal !== null && legacyVal !== '') {
        if (q.conditionalScore !== undefined && !isNaN(q.conditionalScore)) {
          score += q.conditionalScore;
          breakdown[`${q.text} > ${q.conditionalLabel}`] = q.conditionalScore;
        }
      }
    }
  });

  return { score, breakdown };
}
