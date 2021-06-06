import * as React from "react";
import TwitterProfile from "./TwitterProfile";

type TwitterCommunityPros = {
  Data?: Data;
};
const TwitterCommunity: React.FC<TwitterCommunityPros> = ({ Data }) => {
  return (
    <>
      <h1 className="text-white text-2xl md:text-3xl leading-none text-center font-light mb-8">
        {Data.title_community}
      </h1>
      <p className="text-white leading-6 md:leading-none text-center font-light text-base lg:text-lg mb-14">
        {Data.description_community}
      </p>
      <TwitterProfile />
    </>
  );
};

export default TwitterCommunity;
