const getClasses = async (req, res, classCollection) => {
    let query = {};
    if (req.query.id) {
      query = {
        _id: new ObjectId(req.query.id)
      };
    }
    
    const result = await classCollection.aggregate([
        {
          $lookup: {
            from: 'posts',
            let: { classId: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$courseID', '$$classId'],
                  },
                },
              },
            ],
            as: 'posts',
          },
        },
        {
            $lookup: {
              from: 'users',
              localField: 'students',
              foreignField: 'email',
              as: 'studentsInfo',
            },
          },
      ])
        .toArray();
    res.send(result);
  };
  

  module.exports = {
    getClasses
  }