class TextParser {
    constructor() {
        this.datePatterns = [
            // MM/DD/YYYY or MM-DD-YYYY
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
            // Month DD, YYYY
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi,
            // DD Month YYYY
            /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
            // YYYY-MM-DD
            /(\d{4})-(\d{1,2})-(\d{1,2})/g,
            // Weekday patterns
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*,?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/gi,
            // Time patterns
            /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi,
            // Relative dates
            /(next|this)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi,
            /(week|weeks)\s+(from|after)/gi
        ];

        this.timePatterns = [
            /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi,
            /(\d{1,2})\s*(AM|PM|am|pm)/gi,
            /at\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi,
            /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi
        ];

        this.eventKeywords = [
            'exam', 'test', 'quiz', 'assignment', 'homework', 'project', 'due',
            'class', 'lecture', 'lab', 'seminar', 'workshop', 'meeting',
            'midterm', 'final', 'presentation', 'discussion', 'review'
        ];

        this.monthNames = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3,
            'may': 4, 'june': 5, 'july': 6, 'august': 7,
            'september': 8, 'october': 9, 'november': 10, 'december': 11
        };
    }

    parseText(text) {
        const events = [];
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const event = this.extractEventFromLine(line, i, lines);
            if (event) {
                events.push(event);
            }
        }

        return this.deduplicateEvents(events);
    }

    extractEventFromLine(line, lineIndex, allLines) {
        const event = {
            title: '',
            description: '',
            startDate: null,
            endDate: null,
            location: '',
            allDay: false,
            recurrence: null
        };

        // Extract dates
        const dates = this.extractDates(line);
        if (dates.length === 0) return null;

        // Extract times
        const times = this.extractTimes(line);
        
        // Extract event title/description
        event.title = this.extractEventTitle(line);
        event.description = this.extractEventDescription(line, allLines, lineIndex);
        
        // Extract location
        event.location = this.extractLocation(line);

        // Set dates and times
        if (dates.length > 0) {
            event.startDate = dates[0];
            if (dates.length > 1) {
                event.endDate = dates[1];
            } else {
                event.endDate = dates[0];
            }

            // Add time if found
            if (times.length > 0) {
                event.startDate = this.combineDateAndTime(event.startDate, times[0]);
                if (times.length > 1) {
                    event.endDate = this.combineDateAndTime(event.endDate, times[1]);
                } else {
                    // Default to 1 hour duration
                    event.endDate = new Date(event.startDate.getTime() + 60 * 60 * 1000);
                }
                event.allDay = false;
            } else {
                event.allDay = true;
            }
        }

        // Check for recurrence patterns
        event.recurrence = this.extractRecurrence(line);

        return event;
    }

    extractDates(text) {
        const dates = [];
        
        // MM/DD/YYYY or MM-DD-YYYY
        const datePattern1 = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
        let match;
        while ((match = datePattern1.exec(text)) !== null) {
            const month = parseInt(match[1]) - 1;
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            dates.push(new Date(year, month, day));
        }

        // Month DD, YYYY
        const datePattern2 = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi;
        while ((match = datePattern2.exec(text)) !== null) {
            const month = this.monthNames[match[1].toLowerCase()];
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            dates.push(new Date(year, month, day));
        }

        // DD Month YYYY
        const datePattern3 = /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi;
        while ((match = datePattern3.exec(text)) !== null) {
            const day = parseInt(match[1]);
            const month = this.monthNames[match[2].toLowerCase()];
            const year = parseInt(match[3]);
            dates.push(new Date(year, month, day));
        }

        return dates;
    }

    extractTimes(text) {
        const times = [];
        
        // HH:MM AM/PM
        const timePattern1 = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi;
        let match;
        while ((match = timePattern1.exec(text)) !== null) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const ampm = match[3].toUpperCase();
            
            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            times.push({ hours, minutes });
        }

        // HH AM/PM
        const timePattern2 = /(\d{1,2})\s*(AM|PM|am|pm)/gi;
        while ((match = timePattern2.exec(text)) !== null) {
            let hours = parseInt(match[1]);
            const ampm = match[2].toUpperCase();
            
            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            times.push({ hours, minutes: 0 });
        }

        return times;
    }

    extractEventTitle(line) {
        // Look for common event indicators
        for (const keyword of this.eventKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(line)) {
                // Extract text around the keyword
                const parts = line.split(new RegExp(`\\b${keyword}\\b`, 'i'));
                if (parts.length > 1) {
                    return parts[1].trim().substring(0, 100);
                }
            }
        }

        // Fallback: use first part of line
        return line.substring(0, 100);
    }

    extractEventDescription(line, allLines, lineIndex) {
        // Look for additional context in surrounding lines
        let description = line;
        
        // Check next line for more details
        if (lineIndex + 1 < allLines.length) {
            const nextLine = allLines[lineIndex + 1].trim();
            if (nextLine && !this.extractDates(nextLine).length) {
                description += ' ' + nextLine;
            }
        }

        return description.substring(0, 500);
    }

    extractLocation(line) {
        // Look for location indicators
        const locationPatterns = [
            /room\s+(\w+)/i,
            /building\s+(\w+)/i,
            /location:\s*(.+)/i,
            /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
        ];

        for (const pattern of locationPatterns) {
            const match = line.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }

        return '';
    }

    extractRecurrence(line) {
        // Look for weekly patterns
        if (/every\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i.test(line)) {
            const dayMatch = line.match(/every\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
            if (dayMatch) {
                const dayMap = {
                    'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE',
                    'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA', 'Sunday': 'SU'
                };
                return `FREQ=WEEKLY;BYDAY=${dayMap[dayMatch[1]]}`;
            }
        }

        return null;
    }

    combineDateAndTime(date, time) {
        const newDate = new Date(date);
        newDate.setHours(time.hours, time.minutes, 0, 0);
        return newDate;
    }

    deduplicateEvents(events) {
        const uniqueEvents = [];
        const seen = new Set();

        for (const event of events) {
            const key = `${event.title}_${event.startDate.getTime()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
            }
        }

        return uniqueEvents;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextParser;
}
