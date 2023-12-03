
const db = require('../database/models');
const paginate = require('express-paginate');
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const moment = require('moment');
const fetch = require('node-fetch');
const { error } = require('console');

//-------Para usar Api------///
/* const Movies = db.Movie;
const Genres = db.Genre;
const Actors = db.Actor;
const API = 'http://www.omdbapi.com/?apikey=3f49f52d';
 */

const moviesController = {
  list: (req, res) => { 
    const movies = db.Movie.findAll({
      include: ["genre"],
    })
    const genres = db.Genre.findAll({
        order : ['name']
    })
    Promise.all([movies, genres])
    .then(([movies, genres]) => {
      res.render("moviesList", { movies, genres, result : 0 });
    });
      /*db.Movie.findAndCountAll({
        include: ["genre"],
        limit : req.query.limit,
        offset : req.skip
      }).then(({count, rows}) => {

        const pagesCount = Math.ceil(count / req.query.limit)

        console.log(pagesCount);

        return res.render("moviesList", { 
          movies : rows,
          pages : paginate.getArrayPages(req)(pagesCount, pagesCount, req.query.page), 
          paginate,
          pagesCount,
          currentPage :req.query.page
        });
      });*/
    },

  detail: (req, res) => {
    db.Movie.findByPk(req.params.id).then((movie) => {
      return res.render("moviesDetail", { movie, moment });
    });
  },
  new: (req, res) => {
    db.Movie.findAll({
      order: [["release_date", "DESC"]],
      limit: 5,
    }).then((movies) => {
      res.render("newestMovies", { movies });
    });
  },
  recomended: (req, res) => {
    db.Movie.findAll({
      where: {
        rating: { [db.Sequelize.Op.gte]: 8 },
      },
      order: [["rating", "DESC"]],
    }).then((movies) => {
      res.render("recommendedMovies.ejs", { movies });
    });
  },
  
  //----------- buscar por API-----------//
  'buscar': (req, res) => {
    const title = req.query.titulo;

    fetch(`${API}&t=${title}`)

        .then(data => {
            return data.json()
        })
        .then(movie => {
            //console.log(movie)
            return res.render(`moviesDetailOmdb`,{
                movie
            }) 
        })
        .catch(error => console.log(error))
           
},


  //Aqui dispongo las rutas para trabajar con el CRUD
  add: function (req, res) {
    const actors = db.Actor.findAll({
      order : [
        ['first_name'],
        ['last_name']
      ]
    })
    const genres = db.Genre.findAll({
      order: ["name"],
    })

    Promise.all([actors, genres])
      .then(([actors,genres]) => {
        return res.render("moviesAdd", {
          genres,
          actors
        });
      })
      .catch((error) => console.log(error));
  },
  
  create: function (req, res) {
    const { title, rating, awards, release_date, length, genre_id} = req.body;
    const actors = [req.body.actors].flat();
    db.Movie.create({
      title: title.trim(),
      rating,
      awards,
      release_date,
      length,
      genre_id,
      image : req.file ? req.file.filename : null
    })
      .then((movie) => {
        if(actors){
          const actorsDB = actors.map(actor => {
              return {
                  movie_id : movie.id,
                  actor_id : actor
              }
          })
          db.Actor_Movie.bulkCreate(actorsDB,{
              validate : true
          }).then(() => {
           console.log('actores agregados correctamente')
           return res.redirect("/movies");
          })
          
        }else {
          return res.redirect("/movies");
        }
       
      })
      .catch((error) => console.log(error));
  },
  edit: function (req, res) {
    const genres = db.Genre.findAll({
      order: ["name"],
    });
    const movie = db.Movie.findByPk(req.params.id, {
      include: ["actors"]
    });
    const actors = db.Actor.findAll({
      order: [
        ["first_name", "ASC"],
        ["last_name", "ASC"],
      ],
    });

    Promise.all([genres, movie, actors])
      .then(([genres, movie, actors]) => {
        return res.render("moviesEdit", {
          genres,
          movie,
          actors,
          moment,
        });
      })
      .catch((error) => console.log(error));
  },
  update: function (req, res) {
    let { title, awards, rating, length, release_date, genre_id, actors } =
      req.body;
      actors = typeof actors === "string" ? [actors] : actors
    
      db.Movie.update({
          title: title.trim(),
          awards,
          rating,
          release_date,
          length,
          genre_id,
          image : req.file ? req.file.filename : null
        },
        {
          where: {
            id: req.params.id
          }
        }
      )
    .then(() => {
        db.Actor_Movie.destroy({
            where : {
                movie_id : req.params.id
            }
        }).then(() => {
            if(actors){
            const actorsDB = actors.map(actor => {
                return {
                    movie_id : req.params.id,
                    actor_id : actor
                }
            })
            db.Actor_Movie.bulkCreate(actorsDB,{
                validate : true
            }).then(() => console.log('actores agregados correctamente'))
        }
        })
       })
       .catch(error => console.log(error))
       .finally(() => res.redirect('/movies'))
    
  },
  delete: function (req,res) {
    let movieId = req.params.id;
    Movies
    .findByPk(movieId)
    .then(Movie => {
        return res.render(path.resolve(__dirname, '..', 'views',  'moviesDelete'), {Movie})})
    .catch(error => res.send(error))
},
  destroy: function (req, res) {
db.Actor_Movie.destroy({
  where : {
    movie_id : req.params.id
  }
 })
 .then(() => {
  db.Actor.update(
    {
      favorite_movie_id : null
    },
    {
      where : {
        favorite_movie_id : req.params.id
      }
    }
  )
  .then(()=> {
    db.Movie.destroy({
      where : {
        id : req.params.id
      }
    })
      .then(() => {
        return res.redirect('/movies')
      })
  })
 }).catch((error) => console.log(error))
  },
  search :(req,res) => {
    const keyword = req.query.keyword

    db.Movie.findAll({
      where : {
        title : {
          [Op.substring] : keyword
        }
      }
    }).then(movies => {
      return res.render("moviesList", { movies, result : 1});
    }).catch(error => console.log(error))    
  }
};

module.exports = moviesController;
