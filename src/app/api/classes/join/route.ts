import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import dbConnect from '@/lib/mongodb';
import Class from '@/models/Class';

// POST - Join a class with class code
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can join classes' }, { status: 403 });
    }

    const { classCode } = await request.json();

    if (!classCode || !classCode.trim()) {
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 });
    }

    await dbConnect();

    // Find class by code
    const classToJoin = await Class.findOne({ 
      classCode: classCode.trim().toUpperCase(),
      isActive: true 
    }).populate('instructorId', 'username email');

    if (!classToJoin) {
      return NextResponse.json({ error: 'Invalid or inactive class code' }, { status: 404 });
    }

    // Check if already joined
    if (classToJoin.learners.includes(authResult.userId)) {
      return NextResponse.json({ 
        error: 'You have already joined this class',
        class: classToJoin
      }, { status: 400 });
    }

    // Add learner to class
    classToJoin.learners.push(authResult.userId);
    await classToJoin.save();

    // Create notification for instructor
    try {
      const Notification = (await import('@/models/Notification')).default;
      await Notification.create({
        userId: classToJoin.instructorId,
        type: 'class_joined',
        title: 'New Student Joined',
        message: `${authResult.user.username} joined your class "${classToJoin.name}"`,
        relatedId: classToJoin._id,
        relatedModel: 'Class'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the join if notification fails
    }

    const updatedClass = await Class.findById(classToJoin._id)
      .populate('instructorId', 'username email')
      .populate('learners', 'username email');

    return NextResponse.json({ 
      class: updatedClass,
      message: 'Successfully joined class'
    }, { status: 200 });
  } catch (error) {
    console.error('Error joining class:', error);
    return NextResponse.json({ error: 'Failed to join class' }, { status: 500 });
  }
}
