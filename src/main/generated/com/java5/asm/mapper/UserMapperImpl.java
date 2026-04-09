package com.java5.asm.mapper;

import com.java5.asm.dto.UserDto;
import com.java5.asm.dto.req.RegisterReq;
import com.java5.asm.dto.resp.UserResp;
import com.java5.asm.entity.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-09T19:53:44+0700",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.8 (Microsoft)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User toEntity(UserDto userDto) {
        if ( userDto == null ) {
            return null;
        }

        User user = new User();

        user.setUsername( userDto.getUsername() );
        user.setEmail( userDto.getEmail() );
        user.setPassword( userDto.getPassword() );
        user.setFullName( userDto.getFullName() );

        return user;
    }

    @Override
    public User toEntirety(RegisterReq req) {
        if ( req == null ) {
            return null;
        }

        User user = new User();

        user.setUsername( req.username() );
        user.setEmail( req.email() );
        user.setPassword( req.password() );
        user.setFullName( req.fullName() );
        user.setAddress( req.address() );

        return user;
    }

    @Override
    public UserDto toDto(User user) {
        if ( user == null ) {
            return null;
        }

        String username = null;
        String email = null;
        String password = null;
        String fullName = null;

        username = user.getUsername();
        email = user.getEmail();
        password = user.getPassword();
        fullName = user.getFullName();

        UserDto userDto = new UserDto( username, email, password, fullName );

        return userDto;
    }

    @Override
    public UserResp toDtoUserResp(User user) {
        if ( user == null ) {
            return null;
        }

        UserResp.UserRespBuilder userResp = UserResp.builder();

        userResp.id( user.getId() );
        userResp.username( user.getUsername() );
        userResp.email( user.getEmail() );
        userResp.fullName( user.getFullName() );
        userResp.avatar( user.getAvatar() );

        return userResp.build();
    }

    @Override
    public User partialUpdate(UserDto userDto, User user) {
        if ( userDto == null ) {
            return user;
        }

        if ( userDto.getUsername() != null ) {
            user.setUsername( userDto.getUsername() );
        }
        if ( userDto.getEmail() != null ) {
            user.setEmail( userDto.getEmail() );
        }
        if ( userDto.getPassword() != null ) {
            user.setPassword( userDto.getPassword() );
        }
        if ( userDto.getFullName() != null ) {
            user.setFullName( userDto.getFullName() );
        }

        return user;
    }
}
