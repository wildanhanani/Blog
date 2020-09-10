const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWTSecret = "hiashudkah";
const app = express();
const PORT = 6000;

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

mongoose
  .connect("mongodb://localhost/blog", {
    // slice latihan adalah nama databasenya
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log("mongodb connected"))
  .catch((err) => {
    console.log(err);
  });

const Userschema = mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "user", enum: ["user", "admin"] },
});

const User = mongoose.model("User", Userschema);

const Typeschema = mongoose.Schema({
  type: { type: String, required: true },
  //   role: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
});
const Type = mongoose.model("Type", Typeschema);

const Blogschema = mongoose.Schema({
  tittle: { type: String, required: true, lowecase: true },
  contents: { type: String, required: true },
  type: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Type" },
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
});
const Blog = mongoose.model("Blog", Blogschema);

const myware = async (req, res, next) => {
  const user = await User.find({});
  const userfind = req.body.username;
  if (user == userfind) {
    res.status(400).json({ massage: "user has exist" });
  }
  next();
};

app.post("/adduser", async (req, res) => {
  try {
    const { username } = req.body;
    const passwordHash = bcrypt.hashSync(req.body.password, 10);
    const find = await User.findOne({ username: username });
    console.log(find);
    if (find) {
      return res.status(401).json({
        Massage: "username already in use!!",
      });
    }
    const usernameform = username;
    const passwordform = passwordHash;
    const roleform = req.body.role;
    if (!usernameform) {
      return res.status(401).json({
        Massage: "Please insert Username",
      });
    }
    const user = await new User({
      username: usernameform,
      password: passwordform,
      role: roleform,
    }).save();

    res.status(200).json({
      Massage: "Data Succesfull Inputed",
      Data: user,
    });
  } catch (error) {
    res.status(500).json({
      Error: error,
    });
  }
});
app.get("/finduser", async (req, res) => {
  try {
    const user = await User.find({});
    res.status(200).json({
      User: user,
    });
  } catch (error) {}
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    // const userpassword = await User.findOne({ password: req.password });

    const user = await User.findOne({
      username: username,
    });
    console.log(user);

    if (!user) {
      return res.status(401).json({
        msg: "login failed",
      });
    }
    const comparepassword = bcrypt.compareSync(password, user.password);
    if (comparepassword != true) {
      return res.status(401).json({
        msg: "Login Failed",
      });
    }
    const token = JWT.sign({ id: user._id, role: user.role }, JWTSecret, {
      expiresIn: "24h",
    });
    res.status(200).json({
      msg: "login success",
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      msg: "internal server error",
    });
  }
});

const Authadmin = async (req, res, next) => {
  try {
    const headerAuth = req.headers.authorization;

    if (!headerAuth) {
      return res.status(401).json({
        error: "please provide a valid token",
      });
    }
    const token = headerAuth.split(" ")[1]; //mengambil token

    const decode = JWT.verify(token, JWTSecret);
    req.id = decode.id;
    req.role = decode.role; //decode payloadr jwt

    const find = await User.findById({ _id: req.id });

    const role = req.role;
    if (role != "admin" || !find) {
      return res.status(401).json({
        massage: "please provide admin token",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      msg: "please provide a valid token",
    });
  }
};

const Authuser = async (req, res, next) => {
  try {
    const headerAuth = req.headers.authorization;

    if (!headerAuth) {
      return res.status(401).json({
        error: "please provide a valid token",
      });
    }
    const token = headerAuth.split(" ")[1]; //mengambil token

    const decode = JWT.verify(token, JWTSecret);
    req.id = decode.id;
    req.role = decode.role;
    //decode payloadr jwt
    console.log(decode);

    const find = await User.findById({ _id: req.id });

    const role = req.role;
    if (role != "user" || !find) {
      return res.status(401).json({
        massage: "please provide admin token",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      msg: "please provide a valid token",
    });
  }
};

const Authbloguser = async (req, res, next) => {
  try {
    const headerAuth = req.headers.authorization;

    if (!headerAuth) {
      return res.status(401).json({
        error: "please provide a valid token",
      });
    }
    const token = headerAuth.split(" ")[1]; //mengambil token

    const decode = JWT.verify(token, JWTSecret);
    req.id = decode.id;
    req.tittle = decode.tittle;
    req.contents = decode.contents;
    req.user = decode.user; //decode payloadr jwt

    const find = await Blog.find({});
    const user = req.id;
    // console.log(user);
    if (!user) {
      res.status(401).json({ massage: "please provide user token" });
    }

    next();
  } catch (error) {
    res.status(500).json({
      msg: "please provide a valid token",
    });
  }
};

app.post("/type", Authadmin, async (req, res) => {
  try {
    const type = req.body.type;
    const addtype = await new Type({ type: type }).save();
    res.status(200).json({
      Data: addtype,
    });
  } catch (error) {
    res.status(500).json({
      massage: error.massage,
    });
  }
});

app.post("/addblog", Authuser, async (req, res) => {
  try {
    const { type } = req.body;
    const user = req.user;
    const find = await Blog.findOne({ type: type });
    if (!find) {
      res.status(401).json({ Massage: "Please Input type correct" });
    }
    const { tittle, contents } = req.body;
    const blog = await new Blog({
      tittle: tittle,
      contents: contents,
      type: type,
      user: user,
    }).save();
    res.status(200).json({
      Data: blog,
    });
  } catch (error) {
    res.status(500).json({
      massage: error.massage,
    });
  }
});

app.get("/blog", async (req, res) => {
  try {
    const blog = await Blog.find({}).populate("type").populate("user");
    res.status(200).json({
      data: blog,
    });
  } catch (error) {
    res.status(500).json({ massage: error.massage });
  }
});

app.post("/blog/update", Authuser, async (req, res) => {
  try {
    const find = await Blog.findById({ _id: req.query.id });

    if (!find) {
      // check id blog ada apa nggak
      return res.status(404).json({ massage: "Blog Not Found!" });
    }

    if (find.user != req.id) {
      //check user sama apa tidak dengan decode user
      res.status(401).json({ massage: "user not have acces" });
    }
    const upblog = await Blog.findOneAndUpdate(
      { _id: req.query.id },
      req.body,
      {
        new: true,
      }
    );
    res.status(200).json({
      massage: "Data Successfully Updated",
      Data: upblog,
    });
  } catch (error) {
    res.status(500).json({ massage: error.massage });
  }
});
app.post("/blog/delete", Authuser, async (req, res) => {
  try {
    const find = await Blog.findById({ _id: req.query.id });
    if (!find) {
      // check id blog ada apa nggak
      return res.status(404).json({ massage: "Blog Not Found!" });
    }

    if (find.user != req.id) {
      //check user sama apa tidak dengan decode user
      res.status(401).json({ massage: "user not have acces" });
    }

    const delblog = await Blog.findOneAndDelete({
      _id: req.query.id,
    });
    res
      .status(200)
      .json({ Massage: "Data Succesfully Deleted", Data: delblog });
  } catch (error) {
    res.status(500).json({ Massage: error.massage });
  }
});
app.get("/myblog", Authbloguser, async (req, res) => {
  try {
    res.status(200).json({
      data: await Blog.find({ user: req.id }).populate("user").populate("type"),
    });
  } catch (error) {
    res.status(500).json({ massage: "Internal Server Error" });
  }
});

app.get("/findbytype", async (req, res) => {
  try {
    res.status(200).json({
      data: await Blog.find({ type: req.query.type }).populate("type"),
    });
  } catch (error) {
    res.status(500).json({ massage: "Internal Server Error" });
  }
});

app.get("/admin", Authadmin, (req, res) => {
  res
    .status(200)
    .json({ id: req.id, tittle: req.tittle, contents: req.contents });
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
