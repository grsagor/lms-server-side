const getAssignments = async (req, res, assignmentCollection) => {
    let pipeline = [];
    if (req.query.id) {
        pipeline.push({$match: {_id: new ObjectId(req.query.id)}});
    }
    pipeline.push({
        $lookup: {
            from: 'users',
            let: { studentEmail: '$studentEmail' },
            pipeline: [{ $match: { $expr: { $eq: ['$email', '$$studentEmail'] } } }],
            as: 'userInfo'
        }
    });
    pipeline.push({
        $unwind: {
            path: '$userInfo',
            preserveNullAndEmptyArrays: true
        }
    });
    pipeline.push({
        $lookup: {
            from: 'classes',
            let: { courseId: { $toObjectId: '$courseID' } },
            pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$courseId'] } } }],
            as: 'courseInfo'
        }
    });
    pipeline.push({
        $unwind: {
            path: '$courseInfo',
            preserveNullAndEmptyArrays: true
        }
    });
    pipeline.push({
        $lookup: {
            from: 'posts',
            let: {
                postID: {
                  $convert: {
                    input: "$postID",
                    to: "objectId",
                    onError: null
                  }
                }
              },
            pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$postID'] } } }],
            as: 'postInfo'
        }
    });
    pipeline.push({
        $unwind: {
            path: '$postInfo',
            preserveNullAndEmptyArrays: true
        }
    });


    const assignments = await assignmentCollection.aggregate(pipeline).toArray();
    res.send(assignments);
};

module.exports = {
    getAssignments
}