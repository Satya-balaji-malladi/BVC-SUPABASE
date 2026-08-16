import { supabase } from '../supabaseClient';

/**
 * Fetches all active events and returns a mapping of users and students
 * who are currently involved in them (and thus "Active").
 * 
 * Returns an object with two maps:
 * {
 *   activeStudents: Map<roll_number, Array<Event>>,
 *   activeUsers: Map<user_id, Array<Event>>
 * }
 */
export async function getActiveInvolvements() {
  try {
    // 1. Fetch all active events (checking both 'status' and 'event_status' columns)
    const { data: allEvents, error: eventsError } = await supabase
      .from('events')
      .select('*');

    if (eventsError) throw eventsError;

    const activeEvents = (allEvents || []).filter(e => {
      const st = (e.status || e.event_status || '').toLowerCase();
      return ['active', 'published', 'ongoing'].includes(st);
    });

    const activeStudents = new Map();
    const activeUsers = new Map();

    if (activeEvents.length === 0) {
      return { activeStudents, activeUsers };
    }

    const eventIds = activeEvents.map(e => e.event_id);

    // 2. Map organizers/hosts directly from the events table
    activeEvents.forEach(event => {
      const e = {
        ...event,
        venue: event.venue || event.location || 'TBD',
        role: 'Host / Organizer'
      };
      
      const orgKeys = [event.organizer, event.created_by, event.organizer_id].filter(Boolean);
      
      if (event.allowed_coordinator_ids) {
        let additionalAdmins = [];
        if (Array.isArray(event.allowed_coordinator_ids)) {
          additionalAdmins = event.allowed_coordinator_ids;
        } else if (typeof event.allowed_coordinator_ids === 'string') {
          try {
            additionalAdmins = JSON.parse(event.allowed_coordinator_ids);
          } catch(e) {}
        }
        if (Array.isArray(additionalAdmins)) {
          additionalAdmins.forEach(id => {
            if (id && !orgKeys.includes(id)) orgKeys.push(id);
          });
        }
      }

      orgKeys.forEach(key => {
        if (!activeUsers.has(key)) {
          activeUsers.set(key, []);
        }
        if (!activeUsers.get(key).some(x => x.event_id === event.event_id)) {
          activeUsers.get(key).push(e);
        }
      });
    });

    // 3. Fetch participants for these active events
    const { data: participants, error: partsError } = await supabase
      .from('event_participants')
      .select('roll_number, event_id')
      .in('event_id', eventIds);

    if (partsError) throw partsError;

    if (participants) {
      participants.forEach(p => {
        if (!p.roll_number) return;
        
        const event = activeEvents.find(e => e.event_id === p.event_id);
        if (!event) return;

        if (!activeStudents.has(p.roll_number)) {
          activeStudents.set(p.roll_number, []);
        }
        activeStudents.get(p.roll_number).push({
          ...event,
          venue: event.venue || event.location || 'TBD',
          role: 'Participant'
        });
      });
    }

    // 4. Fetch assignments for these active events (coordinators)
    const { data: assignments, error: assignError } = await supabase
      .from('event_coordinators')
      .select('user_id, event_id, assignment_role')
      .in('event_id', eventIds);

    if (!assignError && assignments) {
      assignments.forEach(a => {
        if (!a.user_id) return;
        
        const event = activeEvents.find(e => e.event_id === a.event_id);
        if (!event) return;

        if (!activeUsers.has(a.user_id)) {
          activeUsers.set(a.user_id, []);
        }
        
        // Prevent duplicate event entries if they are both organizer and assigned
        const userEvents = activeUsers.get(a.user_id);
        if (!userEvents.some(e => e.event_id === a.event_id)) {
          userEvents.push({
          ...event,
          venue: event.venue || event.location || 'TBD',
          role: a.assignment_role || 'Coordinator'
        });
        }
      });
    }

    return { activeStudents, activeUsers };
  } catch (error) {
    console.error('Error fetching activity status mapping:', error);
    return { activeStudents: new Map(), activeUsers: new Map() };
  }
}
