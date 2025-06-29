import { getCurrentUser } from './customAuth';
import { supabase } from './supabase';

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    mood_context?: any;
    health_context?: any;
    voice_input?: boolean;
  };
}

export interface DynamicPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'mood' | 'health' | 'medication' | 'appointment' | 'general';
  priority: 'high' | 'medium' | 'low';
  context?: any;
}

// Get user's conversations
export const getUserConversations = async (): Promise<{ data: AIConversation[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', getCurrentUser()?.id)
      .order('last_message_at', { ascending: false });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Get conversation messages
export const getConversationMessages = async (conversationId: string): Promise<{ data: AIMessage[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Create new conversation
export const createConversation = async (title: string): Promise<{ data: AIConversation | null; error: any }> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert([{
        user_id: user.id,
        title,
        last_message_at: new Date().toISOString(),
        message_count: 0
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Add message to conversation
export const addMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: any
): Promise<{ data: AIMessage | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert([{
        conversation_id: conversationId,
        role,
        content,
        timestamp: new Date().toISOString(),
        metadata
      }])
      .select()
      .single();

    if (!error) {
      // First get the current conversation to get the current message count
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('message_count')
        .eq('id', conversationId)
        .single();

      const currentCount = conversation?.message_count || 0;

      // Update conversation last_message_at and increment message count
      await supabase
        .from('ai_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: currentCount + 1
        })
        .eq('id', conversationId);
    }

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Generate dynamic prompts based on user data
export const generateDynamicPrompts = async (): Promise<DynamicPrompt[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const prompts: DynamicPrompt[] = [];

    // Get user's latest mood entry
    const { data: moodEntries } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (moodEntries && moodEntries.length > 0) {
      const latestMood = moodEntries[0];
      
      if (latestMood.mood === 'stressed' || latestMood.mood === 'distressed') {
        prompts.push({
          id: 'mood-support',
          title: 'Feeling Stressed?',
          description: 'I noticed you\'ve been feeling stressed. Let\'s talk about coping strategies.',
          prompt: `I see you've been feeling ${latestMood.mood} recently. I'm here to listen and help you work through these feelings. Would you like to talk about what's been causing you stress?`,
          category: 'mood',
          priority: 'high',
          context: { mood: latestMood }
        });
      } else if (latestMood.mood === 'excellent' || latestMood.mood === 'good') {
        prompts.push({
          id: 'mood-celebrate',
          title: 'Feeling Great!',
          description: 'You\'ve been feeling good lately. Let\'s explore what\'s working well.',
          prompt: `I'm so glad to see you've been feeling ${latestMood.mood}! What's been going well for you lately? I'd love to help you maintain this positive momentum.`,
          category: 'mood',
          priority: 'medium',
          context: { mood: latestMood }
        });
      }

      // High stress level prompt
      if (latestMood.stress_level >= 8) {
        prompts.push({
          id: 'stress-management',
          title: 'High Stress Alert',
          description: 'Your stress levels seem high. Let\'s work on some relaxation techniques.',
          prompt: `I notice your stress level has been quite high (${latestMood.stress_level}/10). High stress can impact both your mental and physical health. Would you like me to guide you through some stress reduction techniques?`,
          category: 'mood',
          priority: 'high',
          context: { stress: latestMood.stress_level }
        });
      }
    }

    // Get upcoming appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .limit(3);

    if (appointments && appointments.length > 0) {
      const nextAppointment = appointments[0];
      const appointmentDate = new Date(nextAppointment.appointment_date);
      const today = new Date();
      const daysUntil = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 3) {
        prompts.push({
          id: 'appointment-prep',
          title: 'Upcoming Appointment',
          description: `You have an appointment with ${nextAppointment.doctor_name || 'your healthcare provider'} soon.`,
          prompt: `I see you have an appointment coming up ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`} with ${nextAppointment.doctor_name || 'your healthcare provider'}. Would you like help preparing questions to ask or discussing any concerns you might have?`,
          category: 'appointment',
          priority: daysUntil <= 1 ? 'high' : 'medium',
          context: { appointment: nextAppointment, daysUntil }
        });
      }
    }

    // Get medication adherence
    const { data: todaysSchedule } = await supabase
      .from('medications')
      .select(`
        *,
        medication_intakes!inner(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Check for missed medications (simplified logic)
    if (todaysSchedule && todaysSchedule.length > 0) {
      prompts.push({
        id: 'medication-adherence',
        title: 'Medication Check-in',
        description: 'Let\'s review your medication routine and address any challenges.',
        prompt: 'How are you doing with your medication routine? Are you experiencing any side effects or having trouble remembering to take your medications? I can help you develop strategies to improve adherence.',
        category: 'medication',
        priority: 'medium',
        context: { medicationCount: todaysSchedule.length }
      });
    }

    // Get recent health metrics for concerning values
    const { data: healthMetrics } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (healthMetrics && healthMetrics.length > 0) {
      // Check for concerning blood pressure
      const systolic = healthMetrics.find(m => m.metric_type === 'blood_pressure_systolic');
      const diastolic = healthMetrics.find(m => m.metric_type === 'blood_pressure_diastolic');
      
      if (systolic && systolic.value > 140) {
        prompts.push({
          id: 'bp-concern',
          title: 'Blood Pressure Discussion',
          description: 'Your recent blood pressure reading was elevated. Let\'s talk about it.',
          prompt: `I noticed your recent blood pressure reading was ${systolic.value}/${diastolic?.value || '?'} mmHg, which is above the normal range. How are you feeling? Have you discussed this with your healthcare provider? I can provide information about lifestyle factors that might help.`,
          category: 'health',
          priority: 'high',
          context: { systolic: systolic.value, diastolic: diastolic?.value }
        });
      }
    }

    // General wellness prompts
    prompts.push({
      id: 'daily-checkin',
      title: 'Daily Check-in',
      description: 'How are you feeling today? Let\'s have a conversation about your wellbeing.',
      prompt: 'Hi there! How are you feeling today? I\'m here to listen and support you with anything that\'s on your mind - whether it\'s about your health, mood, or just life in general.',
      category: 'general',
      priority: 'low',
      context: {}
    });

    prompts.push({
      id: 'wellness-goals',
      title: 'Wellness Goals',
      description: 'Let\'s talk about your health and wellness goals.',
      prompt: 'I\'d love to help you think about your wellness goals. What aspects of your health would you like to focus on improving? We can work together to create a plan that feels manageable and motivating.',
      category: 'general',
      priority: 'low',
      context: {}
    });

    // Sort prompts by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return prompts.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  } catch (error) {
    console.error('Error generating dynamic prompts:', error);
    return [];
  }
};

// Simulate AI response (in a real app, this would call an AI service)
export const generateAIResponse = async (message: string, context?: any): Promise<string> => {
  // This is a mock implementation. In a real app, you would:
  // 1. Send the message and context to an AI service (OpenAI, Anthropic, etc.)
  // 2. Include relevant user health data as context
  // 3. Use specialized prompts for health and wellness conversations
  
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // Simulate API delay

  const responses = [
    "Thank you for sharing that with me. It sounds like you're going through a lot right now. Can you tell me more about what's been most challenging for you?",
    "I hear you, and I want you to know that your feelings are completely valid. It's important to acknowledge what you're experiencing. How can I best support you right now?",
    "That's a great question. Based on what you've shared, it might be helpful to consider a few different approaches. Would you like me to walk through some options with you?",
    "I'm glad you're taking the time to focus on your wellbeing. Self-care is so important, and it looks like you're making positive steps. What's been working well for you lately?",
    "It sounds like you're being really thoughtful about your health. That's wonderful to see. Have you considered discussing this with your healthcare provider as well?",
    "I understand this can feel overwhelming. Let's break it down into smaller, more manageable pieces. What feels like the most important thing to address first?",
    "Your awareness of these patterns is really valuable. Recognizing what affects your mood and health is the first step toward making positive changes. What have you noticed helps you feel better?",
    "Thank you for trusting me with this. It takes courage to talk about these things. Remember, you don't have to navigate this alone - I'm here to support you, and there are also healthcare professionals who can help."
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

// Get counselors from caregivers
export const getAvailableCounselors = async (): Promise<{ data: any[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('caregiver_access')
      .select(`
        *,
        caregiver:caregivers(*)
      `)
      .eq('user_id', getCurrentUser()?.id)
      .eq('status', 'active')
      .in('caregiver.caregiver_type', ['doctor', 'nurse'])
      .neq('mood_tracker_access', 'none');

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};