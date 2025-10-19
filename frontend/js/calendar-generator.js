class CalendarGenerator {
    constructor() {
        this.events = [];
    }

    addEvent(event) {
        this.events.push({
            id: this.generateId(),
            title: event.title || 'Untitled Event',
            description: event.description || '',
            startDate: event.startDate,
            endDate: event.endDate || event.startDate,
            location: event.location || '',
            allDay: event.allDay || false,
            recurrence: event.recurrence || null
        });
    }

    generateId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatDateForICS(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    escapeICS(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    generateICS() {
        const now = new Date();
        const calendarId = 'syllabus-calendar-' + now.getTime();
        
        let ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Syllabus Calendar Converter//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ].join('\r\n') + '\r\n';

        this.events.forEach(event => {
            ics += this.generateEventICS(event);
        });

        ics += 'END:VCALENDAR\r\n';
        return ics;
    }

    generateEventICS(event) {
        const startDate = this.formatDateForICS(event.startDate);
        const endDate = this.formatDateForICS(event.endDate);
        const now = this.formatDateForICS(new Date());
        
        let eventICS = [
            'BEGIN:VEVENT',
            `UID:${event.id}@syllabus-converter.com`,
            `DTSTAMP:${now}`,
            `DTSTART:${event.allDay ? startDate.split('T')[0] : startDate}`,
            `DTEND:${event.allDay ? endDate.split('T')[0] : endDate}`,
            `SUMMARY:${this.escapeICS(event.title)}`
        ];

        if (event.description) {
            eventICS.push(`DESCRIPTION:${this.escapeICS(event.description)}`);
        }

        if (event.location) {
            eventICS.push(`LOCATION:${this.escapeICS(event.location)}`);
        }

        if (event.recurrence) {
            eventICS.push(`RRULE:${event.recurrence}`);
        }

        eventICS.push('END:VEVENT');
        return eventICS.join('\r\n') + '\r\n';
    }

    downloadICS(filename = 'syllabus-calendar.ics') {
        const icsContent = this.generateICS();
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateGoogleCalendarURL() {
        const events = this.events.map(event => {
            const startDate = event.startDate.toISOString();
            const endDate = event.endDate.toISOString();
            const title = encodeURIComponent(event.title);
            const details = encodeURIComponent(event.description);
            const location = encodeURIComponent(event.location);
            
            return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
        });

        return events;
    }

    generateOutlookURL() {
        const events = this.events.map(event => {
            const startDate = event.startDate.toISOString();
            const endDate = event.endDate.toISOString();
            const title = encodeURIComponent(event.title);
            const details = encodeURIComponent(event.description);
            const location = encodeURIComponent(event.location);
            
            return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${details}&location=${location}`;
        });

        return events;
    }

    clear() {
        this.events = [];
    }

    getEventCount() {
        return this.events.length;
    }

    getEvents() {
        return this.events;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarGenerator;
}
